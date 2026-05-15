import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { TelegramMapper } from '@/lib/channels/telegram';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { getTelegramConfig } from '@/lib/channels/config';
import {
  isUpdateProcessed,
  tryAcquireProcessingLock,
  releaseProcessingLock,
  markUpdateProcessed,
} from '@/lib/channels/redis-dedupe';
import { extractTelegramUpdateId } from '@/lib/channels/dedupe';
import { linkMessengerAccount, getOrdersByMessengerId, formatOrderStatus } from '@/lib/channels/link';
import { handleFunnelEvent } from '@/lib/bot/funnel-handler';

// Webhook routes must run on Node.js (we use crypto.timingSafeEqual + Buffer)
// and must never be statically optimized.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CHANNEL = 'telegram' as const;

const mapper = new TelegramMapper();

function timingSafeSecretCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

const HELP_TEXT = `<b>Подряд PRO</b> — платформа для заказа рабочей силы в Омске и Новосибирске.

<b>Команды:</b>
/start — приветствие
/help — справка
/order — создать заказ
/status — статус ваших заказов
/link — привязать аккаунт к номеру телефона
/orders — актуальные заказы (для исполнителей)

Просто напишите, что вам нужно — я помогу!`;

const START_TEXT = `Привет! Я — бот сервиса <b>Подряд PRO</b> 🏗️

Мы помогаем найти:
• Рабочих (грузчики, разнорабочие, строители)

Напишите, что вам нужно, или используйте кнопки ниже.`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // 1. Check channel is enabled
  const config = getTelegramConfig();
  if (!config.enabled) {
    log.error('[TelegramWebhook] Channel disabled — TELEGRAM_BOT_TOKEN not configured');
    return NextResponse.json({ error: 'Channel disabled' }, { status: 503 });
  }

  // 2. Security: webhook secret REQUIRED if configured
  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    if (!timingSafeSecretCompare(secret, expectedSecret)) {
      log.warn('[TelegramWebhook] Forbidden — webhook secret mismatch', { hasSecret: !!secret });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    log.warn('[TelegramWebhook] TELEGRAM_WEBHOOK_SECRET not set — accepting all requests (security gap)');
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, error: 'invalid_json' });
  }

  // 4. Extract update_id
  const rawBody = body as Record<string, unknown>;
  const updateId = extractTelegramUpdateId(rawBody);

  // 5. Distributed deduplication — READ-ONLY check, no write yet
  const alreadyProcessed = await isUpdateProcessed(CHANNEL, updateId);
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // 6. Acquire distributed processing lock (prevents concurrent double-processing)
  const lockAcquired = await tryAcquireProcessingLock(CHANNEL, updateId);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, locked: true });
  }

  // 7. Normalize incoming event
  const event = mapper.normalize(body);
  const userId = event.user_id;
  const chatId = event.chat_id;

  if (!chatId) {
    await markUpdateProcessed(CHANNEL, updateId);
    return NextResponse.json({ ok: true });
  }

  // 8. Rate limit per user (10 messages / minute)
  const rl = await checkRateLimit(`tg:${userId}`, 10, 60_000);
  if (rl.limited) {
    log.warn('[TelegramWebhook] Rate limited', { user_id: userId });
    await releaseProcessingLock(CHANNEL, updateId);
    return NextResponse.json({ ok: true });
  }

  // 9. Fire-and-forget CRM event (deduped by update_id in DB)
  void enqueueJob({
    queueName: 'channels',
    jobType: 'channel.incoming_message',
    dedupeKey: `tg:${updateId}`,
    payload: {
      channel: CHANNEL,
      user_id: userId,
      chat_id: chatId,
      text: event.text,
      type: event.type,
      timestamp: event.timestamp,
    },
  }).catch((err) => {
    log.error('[TelegramWebhook] enqueue failed', { error: String(err) });
  });

  // 10. Return 200 first, process in background.
  //     Queue cleared — Supabase should respond faster now.
  const response = NextResponse.json({ ok: true });

  processMessage(event, userId, chatId, updateId)
    .then(() => markUpdateProcessed(CHANNEL, updateId))
    .catch(async (err) => {
      log.error('[TelegramWebhook] processMessage failed', {
        error: String(err),
        user_id: userId,
        update_id: updateId,
        elapsed_ms: Date.now() - t0,
      });
      await releaseProcessingLock(CHANNEL, updateId);
    });

  return response;

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/*  processMessage (runs in background after 200 response)             */
/* ------------------------------------------------------------------ */

async function processFastStart(chatId: string, userId: string): Promise<void> {
  const router = getChannelRouter();
  try {
    await router.send({
      channel: CHANNEL,
      chat_id: chatId,
      user_id: userId,
      text: '👋 Здравствуйте!\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n📍 <b>В каком городе вы находитесь?</b>',
      parse_mode: 'HTML',
      buttons: [
        [
          { type: 'callback', text: '📍 Омск', callback_data: 'region:omsk' },
          { type: 'callback', text: '📍 Новосибирск', callback_data: 'region:novosibirsk' },
        ],
      ],
    });
  } catch (err) {
    log.error('[TelegramWebhook] fastStart send failed', { error: String(err) });
  }
}

async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean,
): Promise<void> {
  const config = getTelegramConfig();
  try {
    const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
    if (text) body.text = text;
    if (showAlert) body.show_alert = true;
    const res = await fetch(`${config.apiBase}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) {
      log.warn('[TelegramWebhook] answerCallbackQuery API error', { description: json.description });
    }
  } catch (err) {
    log.error('[TelegramWebhook] answerCallbackQuery failed', { error: String(err) });
  }
}

async function sendOrLog(
  router: ReturnType<typeof getChannelRouter>,
  msg: Parameters<ReturnType<typeof getChannelRouter>['send']>[0],
): Promise<void> {
  try {
    const res = await router.send(msg);
    if (!res.success) {
      log.error('[TelegramWebhook] router.send failed', {
        chat_id: msg.chat_id,
        text_len: msg.text.length,
        error: res.error,
      });
    }
  } catch (err) {
    log.error('[TelegramWebhook] router.send threw', { error: String(err), chat_id: msg.chat_id });
  }
}

async function processMessage(
  event: ReturnType<typeof mapper.normalize>,
  userId: string,
  chatId: string,
  updateId: string,
): Promise<void> {
  const router = getChannelRouter();
  const text = event.text.trim();
  const payload = (event.payload ?? {}) as { callback_query_id?: string; username?: string; display_name?: string };
  const callbackQueryId = payload.callback_query_id;

  // ── Funnel handler (Premium integration) ──
  try {
    const funnelResponse = await handleFunnelEvent({
      type: event.type as 'message' | 'command' | 'callback',
      channel: CHANNEL,
      chatId,
      userId,
      text,
      updateId,
      username: payload.username,
      displayName: payload.display_name,
      attachments: event.attachments?.map(a => ({ type: a.type === 'image' ? 'image' as const : 'document' as const, url: a.url })),
    });
    if (funnelResponse) {
      await sendOrLog(router, {
        channel: CHANNEL,
        chat_id: chatId,
        user_id: userId,
        text: funnelResponse.text,
        parse_mode: 'HTML',
        buttons: funnelResponse.buttons,
      });
      if (callbackQueryId) await answerCallbackQuery(callbackQueryId);
      return;
    }
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId);
  } catch (err) {
    log.error('[TelegramWebhook] funnelHandler failed', { error: String(err), user_id: userId });
    if (callbackQueryId) {
      await answerCallbackQuery(callbackQueryId, 'Произошла ошибка. Попробуйте ещё раз.', true);
    }
  }

  // Handle callbacks (legacy fallback)
  if (event.type === 'callback') {
    await sendOrLog(router, {
      channel: CHANNEL,
      chat_id: chatId,
      user_id: userId,
      text: 'Это действие больше не доступно. Пожалуйста, используйте меню ниже.',
      buttons: [
        { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' },
      ],
    });
    return;
  }

  // Handle commands
  if (event.type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case '/start':
        await sendOrLog(router, {
          channel: CHANNEL,
          chat_id: chatId,
          user_id: userId,
          text: START_TEXT,
          parse_mode: 'HTML',
          buttons: [
            [
              { type: 'url', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` },
              { type: 'url', text: '👷 Стать исполнителем', url: `${APP_URL}/executor/register` },
            ],
            [
              { type: 'url', text: '🏗 Каталог', url: `${APP_URL}/catalog/labor` },
            ],
          ],
        });
        return;

      case '/help':
        await sendOrLog(router, {
          channel: CHANNEL,
          chat_id: chatId,
          user_id: userId,
          text: HELP_TEXT,
          parse_mode: 'HTML',
        });
        return;

      case '/order': {
        await sendOrLog(router, {
          channel: CHANNEL,
          chat_id: chatId,
          user_id: userId,
          text: '📋 <b>Оформление заказа</b>\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.',
          parse_mode: 'HTML',
        });
        void enqueueJob({
          queueName: 'leads',
          jobType: 'chat.lead_intent',
          dedupeKey: `lead:tg:${userId}:${updateId}`,
          payload: { user_id: userId, chat_id: chatId, channel: CHANNEL, raw_text: args.join(' ') },
        }).catch((err) => {
          log.error('[TelegramWebhook] lead enqueue failed', { error: String(err), user_id: userId });
        });
        return;
      }

      case '/status': {
        const orders = await getOrdersByMessengerId({ channel: CHANNEL, userId });
        if (orders.length === 0) {
          await sendOrLog(router, {
            channel: CHANNEL,
            chat_id: chatId,
            user_id: userId,
            text: '🔍 <b>Проверка статуса</b>\n\nУ вас пока нет заказов, или ваш Telegram не привязан к аккаунту.\nОтправьте <code>/link ВАШ_ТЕЛЕФОН</code> для привязки.',
            parse_mode: 'HTML',
          });
        } else {
          const lines = orders.slice(0, 5).map((o) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            return `• ${num} — ${formatOrderStatus(String(o.status ?? ''))}`;
          });
          await sendOrLog(router, {
            channel: CHANNEL,
            chat_id: chatId,
            user_id: userId,
            text: `📋 <b>Ваши заказы</b>\n\n${lines.join('\n')}\n\n<a href="${APP_URL}/my">Личный кабинет</a>`,
            parse_mode: 'HTML',
          });
        }
        return;
      }

      case '/link': {
        const phoneArg = args.join('').replace(/\s+/g, '');
        const result = await linkMessengerAccount({ channel: CHANNEL, userId, rawPhone: phoneArg });
        await sendOrLog(router, {
          channel: CHANNEL,
          chat_id: chatId,
          user_id: userId,
          text: result.message,
        });
        return;
      }

      case '/orders': {
        const { data: pubOrders } = await (await import('@/lib/supabase')).getServiceClient()
          .from('orders')
          .select('order_id, order_number, work_type, display_price, city, created_at')
          .in('status', ['published', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (!pubOrders || pubOrders.length === 0) {
          await sendOrLog(router, {
            channel: CHANNEL,
            chat_id: chatId,
            user_id: userId,
            text: '📢 <b>Актуальные заказы</b>\n\nСейчас нет активных заказов. Загляните позже!',
            parse_mode: 'HTML',
          });
        } else {
          const orderLines = pubOrders.map((o: Record<string, unknown>) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            const price = o.display_price ? `${o.display_price} ₽` : 'цена не указана';
            const type = String(o.work_type ?? '');
            return `• ${num} — ${type}, ${price}`;
          });
          await sendOrLog(router, {
            channel: CHANNEL,
            chat_id: chatId,
            user_id: userId,
            text: `📢 <b>Актуальные заказы</b>\n\n${orderLines.join('\n')}\n\n<a href="${APP_URL}/orders">Откликнуться</a>`,
            parse_mode: 'HTML',
          });
        }
        return;
      }

      default:
        break;
    }
  }

  // Free-text message → AI processing
  const maxLen = 2000;
  const trimmedText = text.length > maxLen ? text.slice(0, maxLen) : text;
  if (text.length > maxLen) {
    log.warn('[TelegramWebhook] Message truncated', { user_id: userId, original_len: text.length });
  }

  try {
    const ai = getOpenAIClient();
    const aiResponse = await ai.chat({
      channel: CHANNEL,
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

    await sendOrLog(router, {
      channel: CHANNEL,
      chat_id: chatId,
      user_id: userId,
      text: aiResponse.text,
    });
  } catch (err) {
    log.error('[TelegramWebhook] AI or send failed', { error: String(err), user_id: userId });
    await sendOrLog(router, {
      channel: CHANNEL,
      chat_id: chatId,
      user_id: userId,
      text: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с нами через сайт.',
    });
  }
}
