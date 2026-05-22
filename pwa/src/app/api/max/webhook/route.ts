import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { timingSafeEqual } from 'crypto';
import { MaxMapper } from '@/lib/channels/max';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';
import { getServiceClient } from '@/lib/supabase';
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
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CHANNEL = 'max' as const;
const mapper = new MaxMapper();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  const config = getMaxConfig();
  if (!config.enabled) {
    return NextResponse.json({ error: 'Channel disabled' }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: true, error: 'invalid_json' });
  }
  const rawBody = (body ?? {}) as Record<string, unknown>;

  // Secret validation
  const expectedSecret = process.env.MAX_WEBHOOK_SECRET;
  if (expectedSecret) {
    const secret = getSecret(req, rawBody);
    if (secret !== expectedSecret || secret.length !== expectedSecret.length || !secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const updateId = extractMaxUpdateId(rawBody);

  // All processing in background — respond immediately
  waitUntil(processInBackground(rawBody, updateId, t0).catch((err) => {
    log.error('[MaxWebhook] background failed', { error: String(err), update_id: updateId, elapsed: Date.now() - t0 });
  }));

  return NextResponse.json({ ok: true, update_id: updateId, elapsed: Date.now() - t0 });
}

function getSecret(req: NextRequest, body: Record<string, unknown>): string {
  return (
    req.headers.get('x-max-bot-api-secret-token') ??
    req.headers.get('secret') ??
    req.nextUrl.searchParams.get('secret') ??
    (typeof body.secret === 'string' ? body.secret : '') ??
    ''
  );
}

async function processInBackground(rawBody: Record<string, unknown>, updateId: string, t0: number) {
  // Handle batch
  if (Array.isArray(rawBody.updates)) {
    for (const update of rawBody.updates as Array<Record<string, unknown>>) {
      try {
        const event = mapper.normalize(update);
        const uid = event.user_id;
        const cid = event.chat_id;
        if (!cid) continue;
        const uId = extractMaxUpdateId(update);
        void enqueueJob({ queueName: 'channels', jobType: 'channel.incoming_message', dedupeKey: `max:${uId}`, payload: { channel: CHANNEL, user_id: uid, chat_id: cid, text: event.text, type: event.type, timestamp: event.timestamp } }).catch(() => {});
        void processMessage(event, uid, cid, uId).catch(() => {});
      } catch {}
    }
    return;
  }

  // Dedup
  if (await isUpdateProcessed(CHANNEL, updateId)) return;
  if (!(await tryAcquireProcessingLock(CHANNEL, updateId))) return;

  // Normalize
  const event = mapper.normalize(rawBody);
  const userId = event.user_id;
  const chatId = event.chat_id;
  if (!chatId) { await markUpdateProcessed(CHANNEL, updateId); return; }

  // Rate limit
  const rl = await checkRateLimit(`max:${userId}`, 10, 60_000);
  if (rl.limited) { await releaseProcessingLock(CHANNEL, updateId); return; }

  // Enqueue CRM
  void enqueueJob({ queueName: 'channels', jobType: 'channel.incoming_message', dedupeKey: `max:${updateId}`, payload: { channel: CHANNEL, user_id: userId, chat_id: chatId, text: event.text, type: event.type, timestamp: event.timestamp } }).catch(() => {});

  // Process
  try {
    await processMessage(event, userId, chatId, updateId);
    await markUpdateProcessed(CHANNEL, updateId);
  } catch (err) {
    log.error('[MaxWebhook] processMessage failed', { error: String(err), user_id: userId, update_id: updateId, elapsed: Date.now() - t0 });
    await releaseProcessingLock(CHANNEL, updateId);
  }
}

async function processMessage(
  event: ReturnType<typeof mapper.normalize>,
  userId: string,
  chatId: string,
  updateId: string,
): Promise<void> {
  const router = getChannelRouter();
  const text = (event.text || '').trim();
  const payload = (event.payload ?? {}) as { callback_id?: string; username?: string; display_name?: string };

  // Funnel
  try {
    const res = await handleFunnelEvent({
      type: event.type as 'message' | 'command' | 'callback',
      channel: CHANNEL, chatId, userId, text, updateId,
      username: payload.username, displayName: payload.display_name,
      attachments: event.attachments?.map(a => ({ type: a.type === 'image' ? 'image' as const : 'document' as const, url: a.url })),
    });
    if (res) {
      await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: res.text, buttons: res.buttons });
      return;
    }
  } catch (err) {
    log.error('[MaxWebhook] funnel failed', { error: String(err), user_id: userId });
  }

  // Commands
  if (event.type === 'command') {
    switch (text.split(/\s+/)[0].toLowerCase()) {
      case '/start':
        await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId,
          text: `Привет! Я — бот сервиса Подряд PRO 🏗️\n\nМы помогаем найти:\n• Рабочих (грузчики, разнорабочие, строители)\n\nНапишите, что вам нужно, или используйте кнопки ниже.`,
          buttons: [[
            { type: 'url', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` },
            { type: 'url', text: '👷 Стать исполнителем', url: `${APP_URL}/executor/register` },
          ], [
            { type: 'url', text: '🏗 Каталог', url: `${APP_URL}/catalog/labor` },
          ]] });
        return;
      case '/help':
        await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: `Подряд PRO — платформа для заказа рабочей силы в Омске и Новосибирске.\n\nКоманды:\n/start — приветствие\n/help — справка\n/order — создать заказ\n/status — статус ваших заказов\n/link — привязать аккаунт к номеру телефона\n/orders — актуальные заказы (для исполнителей)\n\nПросто напишите, что вам нужно — я помогу!` });
        return;
      case '/order':
        await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: '📋 Оформление заказа\n\nОпишите, что нужно сделать и где.' });
        return;
      case '/status': {
        const orders = await getOrdersByMessengerId({ channel: CHANNEL, userId });
        if (orders.length === 0) {
          await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: 'У вас пока нет заказов. /link ВАШ_ТЕЛЕФОН для привязки.' });
        } else {
          const lines = orders.slice(0, 5).map((o: any) => `• ${o.order_number ? '#' + o.order_number : 'ID:' + String(o.order_id).slice(0, 8)} — ${formatOrderStatus(String(o.status ?? ''))}`);
          await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: `📋 Ваши заказы\n\n${lines.join('\n')}\n\nПодробнее: ${APP_URL}/my` });
        }
        return;
      }
      case '/link': {
        const phoneArg = text.split(/\s+/).slice(1).join('').replace(/\s+/g, '');
        const result = await linkMessengerAccount({ channel: CHANNEL, userId, rawPhone: phoneArg });
        await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: result.message });
        return;
      }
      case '/orders': {
        const db = getServiceClient();
        const { data } = await db.from('orders').select('order_id,order_number,work_type,display_price,created_at').in('status', ['published','pending']).order('created_at', { ascending: false }).limit(5);
        if (!data || data.length === 0) {
          await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: 'Сейчас нет активных заказов.' });
        } else {
          const lines = data.map((o: any) => `• ${o.order_number ? '#' + o.order_number : 'ID:' + String(o.order_id).slice(0, 8)} — ${o.work_type || ''}, ${o.display_price || 'цена не указана'} ₽`);
          await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: `📢 Актуальные заказы\n\n${lines.join('\n')}\n\nОткликнуться: ${APP_URL}/orders` });
        }
        return;
      }
    }
  }

  // Free text → AI
  try {
    const ai = getOpenAIClient();
    const aiRes = await ai.chat({ channel: CHANNEL, message: text.slice(0, 2000), history: [], systemConstraints: ['Город: Омск, Новосибирск', 'Краткие ответы, 2-3 предложения', 'Без markdown', 'Не выдумывай цены'] });
    await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: aiRes.text });
  } catch {
    await sendOrLog(router, { channel: CHANNEL, chat_id: chatId, user_id: userId, text: 'Извините, произошла ошибка. Попробуйте позже.' });
  }
}

async function sendOrLog(router: ReturnType<typeof getChannelRouter>, msg: Parameters<ReturnType<typeof getChannelRouter>['send']>[0]) {
  try { const r = await router.send(msg); if (!r.success) log.error('[MaxWebhook] send failed', { error: r.error }); }
  catch (err) { log.error('[MaxWebhook] send threw', { error: String(err) }); }
}
