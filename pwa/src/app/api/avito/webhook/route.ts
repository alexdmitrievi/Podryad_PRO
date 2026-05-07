import { NextRequest, NextResponse } from 'next/server';
import { AvitoMapper } from '@/lib/channels/avito';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { getAvitoConfig } from '@/lib/channels/config';
import { isDuplicateUpdate, extractTelegramUpdateId } from '@/lib/channels/dedupe';
import { linkMessengerAccount, getOrdersByMessengerId, formatOrderStatus } from '@/lib/channels/link';
import { timingSafeEqual } from 'crypto';

const mapper = new AvitoMapper();

const HELP_TEXT = `Подряд PRO — платформа для заказа рабочей силы в Омске и Новосибирске.

Команды:
/start — приветствие
/help — справка
/order — создать заказ
/status — статус ваших заказов
/link — привязать аккаунт к номеру телефона
/orders — актуальные заказы (для исполнителей)

Просто напишите, что вам нужно — я помогу!`;

const START_TEXT = `Привет! Я — бот сервиса Подряд PRO 🏗️

Мы помогаем найти:
• Рабочих (грузчики, разнорабочие, строители)

Напишите, что вам нужно, или используйте /order для оформления заказа.`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

/** Timing-safe string comparison for webhook secret validation. */
function timingSafeSecretCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // 1. Check channel is enabled
  const config = getAvitoConfig();
  if (!config.enabled) {
    log.error('[AvitoWebhook] Channel disabled — AVITO_API_TOKEN not configured');
    return NextResponse.json({ error: 'Channel disabled' }, { status: 503 });
  }

  // 2. Security: webhook secret required in production, optional in dev
  const secret = req.headers.get('x-avito-bot-api-secret-token') ?? '';
  const expectedSecret = process.env.AVITO_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!expectedSecret) {
      log.error('[AvitoWebhook] AVITO_WEBHOOK_SECRET not set in production');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    if (!timingSafeSecretCompare(secret, expectedSecret)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (expectedSecret && !timingSafeSecretCompare(secret, expectedSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 3. Deduplicate by update_id (Avito also guarantees at-least-once delivery)
  const rawBody = body as Record<string, unknown>;
  const updateId = extractAvitoUpdateId(rawBody);
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

  // 5. Rate limit per user (10 messages / minute)
  const rl = await checkRateLimit(`avito:${userId}`, 10, 60_000);
  if (rl.limited) {
    log.warn('[AvitoWebhook] Rate limited', { user_id: userId });
    return NextResponse.json({ ok: true });
  }

  // 6. Process message: commands are awaited (fast), free-text runs in background
  if (event.type === 'command') {
    try { await processMessage(event, userId, chatId, updateId); } catch (err) {
      log.error('[AvitoWebhook] processMessage failed', { error: String(err), user_id: userId });
    }
  } else {
    void processMessage(event, userId, chatId, updateId).catch((err) => {
      log.error('[AvitoWebhook] processMessage (free-text) failed', { error: String(err), user_id: userId });
    });
  }

  // 7. Enqueue CRM event (non-blocking, deduped by update_id)
  void enqueueJob({
    queueName: 'channels',
    jobType: 'channel.incoming_message',
    dedupeKey: `avito:${updateId}`,
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

  return NextResponse.json({ ok: true });
}

/** Extract update_id from Avito webhook payload. Uses timestamp-based fallback. */
function extractAvitoUpdateId(body: Record<string, unknown>): string {
  const update = body.update as Record<string, unknown> | undefined;
  return String(update?.update_id ?? body.timestamp ?? Date.now());
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
      channel: 'avito',
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
          dedupeKey: `lead:avito:${userId}:${updateId}`,
          payload: { user_id: userId, chat_id: chatId, channel: 'avito', raw_text: args.join(' ') },
        }).catch((err) => {
          log.error('[AvitoWebhook] lead enqueue failed', { error: String(err), user_id: userId });
        });
        return;

      case '/status': {
        const orders = await getOrdersByMessengerId({ channel: 'avito', userId });
        if (orders.length === 0) {
          await router.send({
            channel: 'avito',
            chat_id: chatId,
            user_id: userId,
            text: '🔍 Проверка статуса\n\nУ вас пока нет заказов, или ваш Avito не привязан к аккаунту.\nОтправьте /link ВАШ_ТЕЛЕФОН для привязки.',
          });
        } else {
          const lines = orders.slice(0, 5).map((o) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            return `• ${num} — ${formatOrderStatus(String(o.status ?? ''))}`;
          });
          await router.send({
            channel: 'avito',
            chat_id: chatId,
            user_id: userId,
            text: `📋 Ваши заказы\n\n${lines.join('\n')}\n\nПодробнее: ${APP_URL}/my`,
          });
        }
        return;
      }

      case '/link': {
        const phoneArg = args.join('').replace(/\s+/g, '');
        const result = await linkMessengerAccount({ channel: 'avito', userId, rawPhone: phoneArg });
        await router.send({
          channel: 'avito',
          chat_id: chatId,
          user_id: userId,
          text: result.message,
        });
        return;
      }

      case '/orders': {
        const { getServiceClient } = await import('@/lib/supabase');
        const { data: pubAvitoOrders } = await getServiceClient()
          .from('orders')
          .select('order_id, order_number, work_type, display_price, city, created_at')
          .in('status', ['published', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (!pubAvitoOrders || pubAvitoOrders.length === 0) {
          await router.send({
            channel: 'avito',
            chat_id: chatId,
            user_id: userId,
            text: '📢 Актуальные заказы\n\nСейчас нет активных заказов. Загляните позже!',
          });
        } else {
          const orderLines = pubAvitoOrders.map((o: Record<string, unknown>) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            const price = o.display_price ? `${o.display_price} ₽` : 'цена не указана';
            const type = String(o.work_type ?? '');
            return `• ${num} — ${type}, ${price}`;
          });
          await router.send({
            channel: 'avito',
            chat_id: chatId,
            user_id: userId,
            text: `📢 Актуальные заказы\n\n${orderLines.join('\n')}\n\nОткликнуться: ${APP_URL}/orders`,
          });
        }
        return;
      }

      default:
        break;
    }
  }

  // Free-text → AI (background-safe: user already got the acknowledgement)
  const maxLen = 2000;
  const trimmedText = text.length > maxLen ? text.slice(0, maxLen) : text;
  if (text.length > maxLen) {
    log.warn('[AvitoWebhook] Message truncated', { user_id: userId, original_len: text.length });
  }

  try {
    const ai = getOpenAIClient();
    const aiResponse = await ai.chat({
      channel: 'avito',
      message: trimmedText,
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
  } catch (err) {
    log.error('[AvitoWebhook] AI or send failed', { error: String(err), user_id: userId });
    await router.send({
      channel: 'avito',
      chat_id: chatId,
      user_id: userId,
      text: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с нами через сайт.',
    }).catch(() => {});
  }
}
