import { NextRequest, NextResponse } from 'next/server';
import { MaxMapper } from '@/lib/channels/max';
import { getChannelRouter } from '@/lib/channels';
import { getMaxConfig } from '@/lib/channels/config';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { getServiceClient } from '@/lib/supabase';
import { handleFunnelEvent } from '@/lib/bot/funnel-handler';
import { linkMessengerAccount, getOrdersByMessengerId, formatOrderStatus } from '@/lib/channels/link';
import {
  isUpdateProcessed,
  tryAcquireProcessingLock,
  releaseProcessingLock,
  markUpdateProcessed,
} from '@/lib/channels/redis-dedupe';
import { extractMaxUpdateId } from '@/lib/channels/dedupe';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 55;

const CHANNEL = 'max' as const;
const mapper = new MaxMapper();

export async function GET(req: NextRequest) {
  // CRON_SECRET check
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(expectedSecret))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const t0 = Date.now();
  const config = getMaxConfig();
  
  if (!config.enabled) {
    return NextResponse.json({ error: 'MAX disabled' }, { status: 503 });
  }

  // Get last marker from storage
  const db = getServiceClient();
  let marker = 0;
  try {
    const { data: markerData } = await db
      .from('webhook_inbox')
      .select('external_id')
      .eq('channel', 'max-poll')
      .order('id', { ascending: false })
      .limit(1);
    if (markerData && markerData.length > 0) {
      marker = parseInt(markerData[0].external_id, 10) || 0;
    }
  } catch { /* use 0 */ }

  // Long Poll MAX for updates
  let updates: Array<Record<string, unknown>> = [];
  try {
    const url = `https://platform-api.max.ru/updates?marker=${marker}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: config.botToken },
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json() as { updates?: Array<Record<string, unknown>>; marker?: number };
      updates = json.updates || [];
      const newMarker = json.marker;
      
      // Store new marker
      if (newMarker && updates.length > 0) {
        try {
          await db.from('webhook_inbox').insert({
            channel: 'max-poll',
            external_id: String(newMarker),
          });
        } catch { /* ignore */ }
      } else if (newMarker && newMarker > marker) {
        try {
          await db.from('webhook_inbox').insert({
            channel: 'max-poll',
            external_id: String(newMarker),
          });
        } catch { /* ignore */ }
      }
    } else {
      log.error('[MaxPoll] GET /updates failed', { status: res.status });
    }
  } catch (err) {
    log.error('[MaxPoll] Poll failed', { error: String(err) });
  }

  let processed = 0;
  let failed = 0;

  for (const raw of updates) {
    try {
      const data = raw as Record<string, unknown>;
      const updateType = String(data.update_type ?? '');
      const updateId = extractMaxUpdateId(data);
      
      // Dedup
      const alreadyProcessed = await isUpdateProcessed(CHANNEL, updateId);
      if (alreadyProcessed) continue;
      
      // Acquire lock
      const lockAcquired = await tryAcquireProcessingLock(CHANNEL, updateId);
      if (!lockAcquired) continue;

      // Normalize
      const event = mapper.normalize(data);
      const userId = event.user_id;
      const chatId = event.chat_id;
      
      if (!chatId) {
        await markUpdateProcessed(CHANNEL, updateId);
        continue;
      }

      // Rate limit
      const rl = await checkRateLimit(`max:${userId}`, 10, 60_000);
      if (rl.limited) {
        await releaseProcessingLock(CHANNEL, updateId);
        continue;
      }

      // CRM event
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
      }).catch(() => {});

      // Process message
      try {
        const router = getChannelRouter();
        const text = event.text.trim();
        
        // Funnel handler
        const funnelResponse = await handleFunnelEvent({
          type: event.type as 'message' | 'command' | 'callback',
          channel: CHANNEL,
          chatId,
          userId,
          text,
          updateId,
          displayName: (data.user as any)?.name,
        });

        if (funnelResponse) {
          await safeSend(router, {
            channel: CHANNEL,
            chat_id: chatId,
            user_id: userId,
            text: funnelResponse.text,
            buttons: funnelResponse.buttons,
          });
          processed++;
          await markUpdateProcessed(CHANNEL, updateId);
          continue;
        }

        // Commands
        if (event.type === 'command' || text.startsWith('/')) {
          const [cmd] = text.split(/\s+/);
          switch (cmd.toLowerCase()) {
            case '/start':
              await safeSend(router, {
                channel: CHANNEL,
                chat_id: chatId,
                user_id: userId,
                text: START_TEXT,
                buttons: [[
                  { type: 'url', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` },
                  { type: 'url', text: '👷 Стать исполнителем', url: `${APP_URL}/executor/register` },
                ], [
                  { type: 'url', text: '🏗 Каталог', url: `${APP_URL}/catalog/labor` },
                ]],
              });
              break;
            case '/help':
              await safeSend(router, {
                channel: CHANNEL,
                chat_id: chatId,
                user_id: userId,
                text: HELP_TEXT,
              });
              break;
            case '/order':
              await safeSend(router, {
                channel: CHANNEL,
                chat_id: chatId,
                user_id: userId,
                text: '📋 Оформление заказа\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»',
              });
              break;
            case '/status':
              try {
                const orders = await getOrdersByMessengerId(CHANNEL, userId);
                if (!orders || orders.length === 0) {
                  await safeSend(router, {
                    channel: CHANNEL,
                    chat_id: chatId,
                    user_id: userId,
                    text: 'У вас пока нет заказов.',
                  });
                } else {
                  const orderList = orders.map(o => `• ${o.order_id} — ${formatOrderStatus(o.status)}`).join('\n');
                  await safeSend(router, {
                    channel: CHANNEL,
                    chat_id: chatId,
                    user_id: userId,
                    text: `📋 Ваши заказы:\n${orderList}`,
                  });
                }
              } catch { /* ignore */ }
              break;
            case '/link': {
              const phoneArg = text.split(/\s+/)[1];
              if (!phoneArg) {
                await safeSend(router, {
                  channel: CHANNEL,
                  chat_id: chatId,
                  user_id: userId,
                  text: 'Укажите номер телефона. Например: /link +79991234567',
                });
              } else {
                const result = await linkMessengerAccount({ channel: CHANNEL, userId, rawPhone: phoneArg });
                await safeSend(router, {
                  channel: CHANNEL,
                  chat_id: chatId,
                  user_id: userId,
                  text: result.ok ? '✅ Аккаунт привязан!' : `❌ ${result.error || 'Не удалось привязать'}`,
                });
              }
              break;
            }
            default:
              // AI fallback
              try {
                const ai = getOpenAIClient();
                const response = await ai.query(text);
                await safeSend(router, {
                  channel: CHANNEL,
                  chat_id: chatId,
                  user_id: userId,
                  text: response || 'Не уловил вопрос 🙈 Напишите оператору.',
                });
              } catch {
                await safeSend(router, {
                  channel: CHANNEL,
                  chat_id: chatId,
                  user_id: userId,
                  text: START_TEXT,
                });
              }
          }
          processed++;
        } else {
          // Free text → AI
          try {
            const ai = getOpenAIClient();
            const response = await ai.query(text);
            await safeSend(router, {
              channel: CHANNEL,
              chat_id: chatId,
              user_id: userId,
              text: response || START_TEXT,
            });
          } catch {
            await safeSend(router, {
              channel: CHANNEL,
              chat_id: chatId,
              user_id: userId,
              text: START_TEXT,
            });
          }
          processed++;
        }
      } catch (err) {
        log.error('[MaxPoll] processMessage failed', { error: String(err) });
        failed++;
      }
      
      await markUpdateProcessed(CHANNEL, updateId);
    } catch (err) {
      log.error('[MaxPoll] event processing error', { error: String(err) });
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    total: updates.length,
    marker,
    elapsed_ms: Date.now() - t0,
  });
}

async function safeSend(
  router: ReturnType<typeof getChannelRouter>,
  msg: Parameters<ReturnType<typeof getChannelRouter>['send']>[0],
): Promise<void> {
  try {
    const res = await router.send(msg);
    if (!res.success) {
      log.error('[MaxPoll] send failed', { chat_id: msg.chat_id, error: res.error });
    }
  } catch (err) {
    log.error('[MaxPoll] send threw', { error: String(err) });
  }
}
