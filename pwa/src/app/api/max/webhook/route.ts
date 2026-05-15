import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { MaxMapper } from '@/lib/channels/max';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { getMaxConfig } from '@/lib/channels/config';
import {
  isUpdateProcessed,
  tryAcquireProcessingLock,
  releaseProcessingLock,
  markUpdateProcessed,
} from '@/lib/channels/redis-dedupe';
import { extractMaxUpdateId } from '@/lib/channels/dedupe';
import { linkMessengerAccount, getOrdersByMessengerId, formatOrderStatus } from '@/lib/channels/link';
import { handleFunnelEvent } from '@/lib/bot/funnel-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CHANNEL = 'max' as const;

const mapper = new MaxMapper();

function timingSafeSecretCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function readMaxSecret(req: NextRequest, body: Record<string, unknown> | null): string {
  return (
    req.headers.get('x-max-bot-api-secret-token') ??
    req.headers.get('secret') ??
    req.nextUrl.searchParams.get('secret') ??
    (body && typeof body.secret === 'string' ? body.secret : '') ??
    ''
  );
}

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

Напишите, что вам нужно, или используйте кнопки ниже.`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // 1. Check channel is enabled
  const config = getMaxConfig();
  if (!config.enabled) {
    log.error('[MaxWebhook] Channel disabled — MAX_BOT_TOKEN not configured');
    return NextResponse.json({ error: 'Channel disabled' }, { status: 503 });
  }

  // Parse body first to check for in-body secret
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, error: 'invalid_json' });
  }
  const rawBody = (body ?? {}) as Record<string, unknown>;

  // 2. Security: webhook secret
  const expectedSecret = process.env.MAX_WEBHOOK_SECRET;
  if (expectedSecret) {
    const secret = readMaxSecret(req, rawBody);
    if (!timingSafeSecretCompare(secret, expectedSecret)) {
      log.warn('[MaxWebhook] Forbidden — webhook secret mismatch', { hasSecret: !!secret });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    log.warn('[MaxWebhook] MAX_WEBHOOK_SECRET not set — accepting all requests (security gap)');
  }

  // 3. Extract update_id
  const updateId = extractMaxUpdateId(rawBody);

  // 4. Distributed deduplication — READ-ONLY check
  const alreadyProcessed = await isUpdateProcessed(CHANNEL, updateId);
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // 5. Acquire distributed processing lock
  const lockAcquired = await tryAcquireProcessingLock(CHANNEL, updateId);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, locked: true });
  }

  // 6. Normalize incoming event
  const event = mapper.normalize(body);
  const userId = event.user_id;
  const chatId = event.chat_id;

  if (!chatId) {
    await markUpdateProcessed(CHANNEL, updateId);
    return NextResponse.json({ ok: true });
  }

  // 7. Rate limit per user
  const rl = await checkRateLimit(`max:${userId}`, 10, 60_000);
  if (rl.limited) {
    log.warn('[MaxWebhook] Rate limited', { user_id: userId });
    await releaseProcessingLock(CHANNEL, updateId);
    return NextResponse.json({ ok: true });
  }

  // 8. Fire-and-forget CRM event
  void enqueueJob({
    queueName: 'channels',
    jobType: 'channel.incoming_message',
    dedupeKey: `max:${updateId}`,
    payload: {
      channel: CHANNEL,
      user_id: userId,
      chat_id: chatId,
      text: event.text,
      type: event.type,
      timestamp: event.timestamp,
    },
  }).catch((err) => {
    log.error('[MaxWebhook] enqueue failed', { error: String(err) });
  });

  // 9. Process message synchronously. On Vercel Hobby, background processing
  //     is killed after response.
  try {
    await processMessage(event, userId, chatId, updateId);
    await markUpdateProcessed(CHANNEL, updateId);
  } catch (err) {
    log.error('[MaxWebhook] processMessage failed', {
      error: String(err),
      user_id: userId,
      update_id: updateId,
      elapsed_ms: Date.now() - t0,
    });
    await releaseProcessingLock(CHANNEL, updateId);
  }

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/*  processMessage (runs in background after 200 response)             */
/* ------------------------------------------------------------------ */

async function answerMaxCallback(
  callbackId: string,
  text?: string,
): Promise<void> {
  const config = getMaxConfig();
  const tokenParam = `access_token=${encodeURIComponent(config.botToken)}`;
  const proxyBase = process.env.MAX_API_PROXY;
  try {
    const url = proxyBase
      ? `${proxyBase}/proxy/max/callbacks/${encodeURIComponent(callbackId)}/answer?${tokenParam}`
      : `${config.apiBase}/callbacks/${encodeURIComponent(callbackId)}/answer?${tokenParam}`;
    const body: Record<string, unknown> = {};
    if (text) body.text = text;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (err) {
    log.error('[MaxWebhook] answerMaxCallback failed', { error: String(err) });
  }
}

async function sendOrLog(
  router: ReturnType<typeof getChannelRouter>,
  msg: Parameters<ReturnType<typeof getChannelRouter>['send']>[0],
): Promise<void> {
  try {
    const res = await router.send(msg);
    if (!res.success) {
      log.error('[MaxWebhook] router.send failed', {
        chat_id: msg.chat_id,
        text_len: msg.text.length,
        error: res.error,
      });
    }
  } catch (err) {
    log.error('[MaxWebhook] router.send threw', { error: String(err), chat_id: msg.chat_id });
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
  const payload = (event.payload ?? {}) as { callback_id?: string; username?: string; display_name?: string };
  const maxCallbackId = payload.callback_id;

  // ── Funnel handler ──
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
        buttons: funnelResponse.buttons,
      });
      if (maxCallbackId) await answerMaxCallback(maxCallbackId);
      return;
    }
    if (maxCallbackId) await answerMaxCallback(maxCallbackId);
  } catch (err) {
    log.error('[MaxWebhook] funnelHandler failed', { error: String(err), user_id: userId });
    if (maxCallbackId) await answerMaxCallback(maxCallbackId, 'Произошла ошибка. Попробуйте ещё раз.');
  }

  // Callbacks (legacy fallback)
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

  // Commands
  if (event.type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case '/start':
        await sendOrLog(router, {
          channel: CHANNEL,
          chat_id: chatId,
          user_id: userId,
          text: START_TEXT,
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
        });
        return;

      case '/order': {
        await sendOrLog(router, {
          channel: CHANNEL,
          chat_id: chatId,
          user_id: userId,
          text: '📋 Оформление заказа\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.',
        });
        void enqueueJob({
          queueName: 'leads',
          jobType: 'chat.lead_intent',
          dedupeKey: `lead:max:${userId}:${updateId}`,
          payload: { user_id: userId, chat_id: chatId, channel: CHANNEL, raw_text: args.join(' ') },
        }).catch((err) => {
          log.error('[MaxWebhook] lead enqueue failed', { error: String(err), user_id: userId });
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
            text: '🔍 Проверка статуса\n\nУ вас пока нет заказов, или ваш MAX не привязан к аккаунту.\nОтправьте /link ВАШ_ТЕЛЕФОН для привязки.',
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
            text: `📋 Ваши заказы\n\n${lines.join('\n')}\n\nПодробнее: ${APP_URL}/my`,
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
        const { data: pubMaxOrders } = await (await import('@/lib/supabase')).getServiceClient()
          .from('orders')
          .select('order_id, order_number, work_type, display_price, city, created_at')
          .in('status', ['published', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (!pubMaxOrders || pubMaxOrders.length === 0) {
          await sendOrLog(router, {
            channel: CHANNEL,
            chat_id: chatId,
            user_id: userId,
            text: '📢 Актуальные заказы\n\nСейчас нет активных заказов. Загляните позже!',
          });
        } else {
          const orderLines = pubMaxOrders.map((o: Record<string, unknown>) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            const price = o.display_price ? `${o.display_price} ₽` : 'цена не указана';
            const type = String(o.work_type ?? '');
            return `• ${num} — ${type}, ${price}`;
          });
          await sendOrLog(router, {
            channel: CHANNEL,
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

  // Free-text → AI
  const maxLen = 2000;
  const trimmedText = text.length > maxLen ? text.slice(0, maxLen) : text;
  if (text.length > maxLen) {
    log.warn('[MaxWebhook] Message truncated', { user_id: userId, original_len: text.length });
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
    log.error('[MaxWebhook] AI or send failed', { error: String(err), user_id: userId });
    await sendOrLog(router, {
      channel: CHANNEL,
      chat_id: chatId,
      user_id: userId,
      text: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с нами через сайт.',
    });
  }
}
