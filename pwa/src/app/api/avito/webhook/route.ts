import { NextRequest, NextResponse } from 'next/server';
import { AvitoMapper } from '@/lib/channels/avito';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

const mapper = new AvitoMapper();

const HELP_TEXT = `Подряд PRO — платформа для заказа рабочей силы, техники и стройматериалов в Омске и Новосибирске.

Команды:
/start — приветствие
/help — справка
/order — создать заказ
/status — проверить статус заказа

Просто напишите, что вам нужно — я помогу!`;

const START_TEXT = `Привет! Я — бот сервиса Подряд PRO 🏗️

Мы помогаем найти:
• Рабочих (грузчики, разнорабочие, строители)
• Технику в аренду (от перфоратора до экскаватора)
• Стройматериалы с доставкой

Напишите, что вам нужно, или используйте /order для оформления заказа.`;

export async function POST(req: NextRequest) {
  // 1. Security: validate webhook secret header
  const secret = req.headers.get('x-avito-bot-api-secret-token');
  const expectedSecret = process.env.AVITO_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 2. Normalize incoming event
  const event = mapper.normalize(body);
  const userId = event.user_id;
  const chatId = event.chat_id;

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  // 3. Rate limit per user (10 messages / minute)
  const rl = await checkRateLimit(`avito:${userId}`, 10, 60_000);
  if (rl.limited) {
    log.warn('[AvitoWebhook] Rate limited', { user_id: userId });
    return NextResponse.json({ ok: true });
  }

  // 4. Ack immediately — process in background
  const responsePromise = processMessage(event, userId, chatId);

  // 5. Enqueue CRM event
  void enqueueJob({
    queueName: 'channels',
    jobType: 'channel.incoming_message',
    dedupeKey: `avito:${userId}:${Date.now()}`,
    payload: {
      channel: 'avito',
      user_id: userId,
      chat_id: chatId,
      text: event.text,
      type: event.type,
      timestamp: event.timestamp,
    },
  }).catch((err) => {
    log.error('[AvitoWebhook] enqueue failed', { error: String(err) });
  });

  void responsePromise.catch((err) => {
    log.error('[AvitoWebhook] processMessage failed', { error: String(err), user_id: userId });
  });

  return NextResponse.json({ ok: true });
}

function isCommand(text: string): boolean {
  return /^\/[a-zA-Z0-9_]+/.test(text.trim());
}

async function processMessage(
  event: ReturnType<typeof mapper.normalize>,
  userId: string,
  chatId: string,
): Promise<void> {
  const router = getChannelRouter();
  const text = event.text.trim();

  // Avito maps callbacks as message type — handle inline data detection
  if (event.type === 'callback') {
    await router.send({
      channel: 'avito',
      chat_id: chatId,
      user_id: userId,
      text: `Вы выбрали: ${text}`,
    });
    return;
  }

  // Avito does not have native commands — detect by leading slash
  if (isCommand(text)) {
    const [cmd, ...args] = text.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case '/start':
        await router.send({
          channel: 'avito',
          chat_id: chatId,
          user_id: userId,
          text: START_TEXT,
        });
        return;

      case '/help':
        await router.send({
          channel: 'avito',
          chat_id: chatId,
          user_id: userId,
          text: HELP_TEXT,
        });
        return;

      case '/order':
        await router.send({
          channel: 'avito',
          chat_id: chatId,
          user_id: userId,
          text: '📋 Оформление заказа\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.',
        });
        void enqueueJob({
          queueName: 'leads',
          jobType: 'chat.lead_intent',
          dedupeKey: `lead:avito:${userId}:${Date.now()}`,
          payload: { user_id: userId, chat_id: chatId, channel: 'avito', raw_text: args.join(' ') },
        }).catch(() => {});
        return;

      case '/status':
        await router.send({
          channel: 'avito',
          chat_id: chatId,
          user_id: userId,
          text: '🔍 Проверка статуса\n\nЧтобы узнать статус заказа, укажите ваш номер телефона или номер заказа.\n\nИли перейдите в личный кабинет: Подряд PRO (' + (process.env.NEXT_PUBLIC_APP_URL || 'https://podryad.pro') + '/my)',
        });
        return;

      default:
        break;
    }
  }

  // Free-text message → AI processing
  const ai = getOpenAIClient();
  const aiResponse = await ai.chat({
    channel: 'avito',
    message: text,
    history: [],
    systemConstraints: [
      'Город работы: Омск, Новосибирск',
      'Ты помогаешь заказать рабочую силу, технику или стройматериалы',
      'Если пользователь хочет заказ — предложи описать детали',
      'Краткие ответы, 2-3 предложения максимум',
      'Не выдумывай цены',
      'Отвечай обычным текстом, без маркдауна',
    ],
  });

  await router.send({
    channel: 'avito',
    chat_id: chatId,
    user_id: userId,
    text: aiResponse.text,
  });
}
