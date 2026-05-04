import { NextRequest, NextResponse } from 'next/server';
import { MaxMapper } from '@/lib/channels/max';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { getMaxConfig } from '@/lib/channels/config';
import { isDuplicateUpdate, extractMaxUpdateId } from '@/lib/channels/dedupe';

const mapper = new MaxMapper();

const HELP_TEXT = `*Подряд PRO* — платформа для заказа рабочей силы, техники и стройматериалов в Омске и Новосибирске.

*Команды:*
/start — приветствие
/help — справка
/order — создать заказ
/status — проверить статус заказа

Просто напишите, что вам нужно — я помогу!`;

const START_TEXT = `Привет! Я — бот сервиса *Подряд PRO* 🏗️

Мы помогаем найти:
• Рабочих (грузчики, разнорабочие, строители)
• Технику в аренду (от перфоратора до экскаватора)
• Стройматериалы с доставкой

Напишите, что вам нужно, или используйте кнопки ниже.`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

export async function POST(req: NextRequest) {
  // 1. Check channel is enabled
  const config = getMaxConfig();
  if (!config.enabled) {
    log.error('[MaxWebhook] Channel disabled — MAX_BOT_TOKEN not configured');
    return NextResponse.json({ error: 'Channel disabled' }, { status: 503 });
  }

  // 2. Security: webhook secret required in production, optional in dev
  const secret = req.headers.get('x-max-bot-api-secret-token');
  const expectedSecret = process.env.MAX_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!expectedSecret) {
      log.error('[MaxWebhook] MAX_WEBHOOK_SECRET not set in production');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 3. Deduplicate by update_id
  const rawBody = body as Record<string, unknown>;
  const updateId = extractMaxUpdateId(rawBody);
  if (isDuplicateUpdate(updateId)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // 4. Normalize incoming event
  const event = mapper.normalize(body);
  const userId = event.user_id;
  const chatId = event.chat_id;

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  // 5. Rate limit per user
  const rl = await checkRateLimit(`max:${userId}`, 10, 60_000);
  if (rl.limited) {
    log.warn('[MaxWebhook] Rate limited', { user_id: userId });
    return NextResponse.json({ ok: true });
  }

  // 6. Process message: commands are awaited (fast), free-text runs in background
  const isCommand = event.type === 'command';
  if (isCommand) {
    try {
      await processMessage(event, userId, chatId, updateId);
    } catch (err) {
      log.error('[MaxWebhook] processMessage failed', { error: String(err), user_id: userId });
    }
  } else {
    void processMessage(event, userId, chatId, updateId).catch((err) => {
      log.error('[MaxWebhook] processMessage (free-text) failed', { error: String(err), user_id: userId });
    });
  }

  // 7. Enqueue CRM event (deduped by update_id)
  void enqueueJob({
    queueName: 'channels',
    jobType: 'channel.incoming_message',
    dedupeKey: `max:${updateId}`,
    payload: {
      channel: 'max',
      user_id: userId,
      chat_id: chatId,
      text: event.text,
      type: event.type,
      timestamp: event.timestamp,
    },
  }).catch((err) => {
    log.error('[MaxWebhook] enqueue failed', { error: String(err) });
  });

  return NextResponse.json({ ok: true });
}

async function processMessage(
  event: ReturnType<typeof mapper.normalize>,
  userId: string,
  chatId: string,
  updateId: string,
): Promise<void> {
  const router = getChannelRouter();
  const text = event.text.trim();

  // Callbacks
  if (event.type === 'callback') {
    await router.send({
      channel: 'max',
      chat_id: chatId,
      user_id: userId,
      text: `Вы выбрали: ${text}`,
    });
    return;
  }

  // Commands
  if (event.type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case '/start':
        await router.send({
          channel: 'max',
          chat_id: chatId,
          user_id: userId,
          text: START_TEXT,
          parse_mode: 'Markdown',
          buttons: [
            { type: 'url', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` },
            { type: 'url', text: '👷 Стать исполнителем', url: `${APP_URL}/executor/register` },
            { type: 'url', text: '🏗 Каталог', url: `${APP_URL}/catalog/labor` },
          ],
        });
        return;

      case '/help':
        await router.send({
          channel: 'max',
          chat_id: chatId,
          user_id: userId,
          text: HELP_TEXT,
          parse_mode: 'Markdown',
        });
        return;

      case '/order':
        await router.send({
          channel: 'max',
          chat_id: chatId,
          user_id: userId,
          text: '📋 *Оформление заказа*\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.',
          parse_mode: 'Markdown',
        });
        void enqueueJob({
          queueName: 'leads',
          jobType: 'chat.lead_intent',
          dedupeKey: `lead:max:${userId}:${updateId}`,
          payload: { user_id: userId, chat_id: chatId, channel: 'max', raw_text: args.join(' ') },
        }).catch((err) => {
          log.error('[MaxWebhook] lead enqueue failed', { error: String(err), user_id: userId });
        });
        return;

      case '/status':
        await router.send({
          channel: 'max',
          chat_id: chatId,
          user_id: userId,
          text: '🔍 *Проверка статуса*\n\nЧтобы узнать статус заказа, укажите ваш номер телефона или номер заказа.\n\nИли перейдите в личный кабинет: Подряд PRO (' + APP_URL + '/my)',
          parse_mode: 'Markdown',
        });
        return;

      default:
        break;
    }
  }

  // Free-text → AI
  const maxLen = 2000;
  const trimmedText = text.length > maxLen ? text.slice(0, maxLen) : text;
  if (text.length > maxLen) {
    log.warn('[MaxWebhook] Message truncated', { user_id: userId, original_len: text.length });
  }

  try {
    const ai = getOpenAIClient();
    const aiResponse = await ai.chat({
      channel: 'max',
      message: trimmedText,
      history: [],
      systemConstraints: [
        'Город работы: Омск, Новосибирск',
        'Ты помогаешь заказать рабочую силу, технику или стройматериалы',
        'Если пользователь хочет заказ — предложи описать детали',
        'Краткие ответы, 2-3 предложения максимум',
        'Не выдумывай цены',
        'Не используй markdown-разметку в ответах',
      ],
    });

    await router.send({
      channel: 'max',
      chat_id: chatId,
      user_id: userId,
      text: aiResponse.text,
    });
  } catch (err) {
    log.error('[MaxWebhook] AI or send failed', { error: String(err), user_id: userId });
    await router.send({
      channel: 'max',
      chat_id: chatId,
      user_id: userId,
      text: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с нами через сайт.',
    }).catch(() => {});
  }
}
