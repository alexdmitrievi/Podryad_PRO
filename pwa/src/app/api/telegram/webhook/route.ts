import { NextRequest, NextResponse } from 'next/server';
import { TelegramMapper } from '@/lib/channels/telegram';
import { getChannelRouter } from '@/lib/channels';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { enqueueJob } from '@/lib/job-queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { getTelegramConfig } from '@/lib/channels/config';
import { isDuplicateUpdate, extractTelegramUpdateId } from '@/lib/channels/dedupe';
import { linkMessengerAccount, getOrdersByMessengerId, formatOrderStatus } from '@/lib/channels/link';

const mapper = new TelegramMapper();

const HELP_TEXT = `*Подряд PRO* — платформа для заказа рабочей силы, техники и стройматериалов в Омске и Новосибирске.

*Команды:*
/start — приветствие
/help — справка
/order — создать заказ
/status — статус ваших заказов
/link — привязать аккаунт к номеру телефона
/orders — актуальные заказы (для исполнителей)

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
  const config = getTelegramConfig();
  if (!config.enabled) {
    log.error('[TelegramWebhook] Channel disabled — TELEGRAM_BOT_TOKEN not configured');
    return NextResponse.json({ error: 'Channel disabled' }, { status: 503 });
  }

  // 2. Security: webhook secret required in production, optional in dev
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!expectedSecret) {
      log.error('[TelegramWebhook] TELEGRAM_WEBHOOK_SECRET not set in production');
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

  // 3. Deduplicate by update_id (Telegram guarantees at-least-once delivery)
  const rawBody = body as Record<string, unknown>;
  const updateId = extractTelegramUpdateId(rawBody);
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
  const rl = await checkRateLimit(`tg:${userId}`, 10, 60_000);
  if (rl.limited) {
    log.warn('[TelegramWebhook] Rate limited', { user_id: userId });
    return NextResponse.json({ ok: true });
  }

  // 6. Process message: commands are awaited (fast), free-text runs in background
  const isCommand = event.type === 'command';
  if (isCommand) {
    // Commands (/start, /help, /order, /status) are fast — await them
    try {
      await processMessage(event, userId, chatId, updateId);
    } catch (err) {
      log.error('[TelegramWebhook] processMessage failed', { error: String(err), user_id: userId });
    }
  } else {
    // Free-text → AI is slow — run in background with catch
    void processMessage(event, userId, chatId, updateId).catch((err) => {
      log.error('[TelegramWebhook] processMessage (free-text) failed', { error: String(err), user_id: userId });
    });
  }

  // 7. Enqueue CRM event (non-blocking, deduped by update_id)
  void enqueueJob({
    queueName: 'channels',
    jobType: 'channel.incoming_message',
    dedupeKey: `tg:${updateId}`,
    payload: {
      channel: 'telegram',
      user_id: userId,
      chat_id: chatId,
      text: event.text,
      type: event.type,
      timestamp: event.timestamp,
    },
  }).catch((err) => {
    log.error('[TelegramWebhook] enqueue failed', { error: String(err) });
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

  // Handle callbacks
  if (event.type === 'callback') {
    await router.send({
      channel: 'telegram',
      chat_id: chatId,
      user_id: userId,
      text: `Вы выбрали: ${text}`,
    });
    return;
  }

  // Handle commands
  if (event.type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case '/start':
        await router.send({
          channel: 'telegram',
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
          channel: 'telegram',
          chat_id: chatId,
          user_id: userId,
          text: HELP_TEXT,
          parse_mode: 'Markdown',
        });
        return;

      case '/order':
        await router.send({
          channel: 'telegram',
          chat_id: chatId,
          user_id: userId,
          text: '📋 *Оформление заказа*\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.',
          parse_mode: 'Markdown',
        });
        void enqueueJob({
          queueName: 'leads',
          jobType: 'chat.lead_intent',
          dedupeKey: `lead:tg:${userId}:${updateId}`,
          payload: { user_id: userId, chat_id: chatId, channel: 'telegram', raw_text: args.join(' ') },
        }).catch((err) => {
          log.error('[TelegramWebhook] lead enqueue failed', { error: String(err), user_id: userId });
        });
        return;

      case '/status':
        const orders = await getOrdersByMessengerId({ channel: 'telegram', userId });
        if (orders.length === 0) {
          await router.send({
            channel: 'telegram',
            chat_id: chatId,
            user_id: userId,
            text: '🔍 *Проверка статуса*\n\nУ вас пока нет заказов, или ваш Telegram не привязан к аккаунту.\nОтправьте `/link ВАШ_ТЕЛЕФОН` для привязки.',
            parse_mode: 'Markdown',
          });
        } else {
          const lines = orders.slice(0, 5).map((o) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            return `• ${num} — ${formatOrderStatus(String(o.status ?? ''))}`;
          });
          await router.send({
            channel: 'telegram',
            chat_id: chatId,
            user_id: userId,
            text: `📋 *Ваши заказы*\n\n${lines.join('\n')}\n\nПодробнее: [Личный кабинет](${APP_URL}/my)`,
            parse_mode: 'Markdown',
          });
        }
        return;

      case '/link': {
        const phoneArg = args.join('').replace(/\s+/g, '');
        const result = await linkMessengerAccount({ channel: 'telegram', userId, rawPhone: phoneArg });
        await router.send({
          channel: 'telegram',
          chat_id: chatId,
          user_id: userId,
          text: result.message,
          parse_mode: result.ok ? undefined : undefined,
        });
        return;
      }

      case '/orders':
        // Browse available orders (for contractors)
        const { data: pubOrders } = await (await import('@/lib/supabase')).getServiceClient()
          .from('orders')
          .select('order_id, order_number, work_type, display_price, city, created_at')
          .in('status', ['published', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (!pubOrders || pubOrders.length === 0) {
          await router.send({
            channel: 'telegram',
            chat_id: chatId,
            user_id: userId,
            text: '📢 *Актуальные заказы*\n\nСейчас нет активных заказов. Загляните позже!',
            parse_mode: 'Markdown',
          });
        } else {
          const orderLines = pubOrders.map((o: Record<string, unknown>) => {
            const num = o.order_number ? `#${o.order_number}` : `ID: ${String(o.order_id).slice(0, 8)}`;
            const price = o.display_price ? `${o.display_price} ₽` : 'цена не указана';
            const type = String(o.work_type ?? '');
            return `• ${num} — ${type}, ${price}`;
          });
          await router.send({
            channel: 'telegram',
            chat_id: chatId,
            user_id: userId,
            text: `📢 *Актуальные заказы*\n\n${orderLines.join('\n')}\n\nОткликнуться: [Сайт](${APP_URL}/orders)`,
            parse_mode: 'Markdown',
          });
        }
        return;

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
      channel: 'telegram',
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
      channel: 'telegram',
      chat_id: chatId,
      user_id: userId,
      text: aiResponse.text,
    });
  } catch (err) {
    log.error('[TelegramWebhook] AI or send failed', { error: String(err), user_id: userId });
    await router.send({
      channel: 'telegram',
      chat_id: chatId,
      user_id: userId,
      text: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с нами через сайт.',
    }).catch(() => {});
  }
}
