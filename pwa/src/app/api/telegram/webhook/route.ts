import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { TelegramMapper } from '@/lib/channels/telegram';
import { log } from '@/lib/logger';
import { getTelegramConfig } from '@/lib/channels/config';
import { handleFunnelEvent } from '@/lib/bot/funnel-handler';
import { getChannelRouter } from '@/lib/channels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHANNEL = 'telegram' as const;
const mapper = new TelegramMapper();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function timingSafeSecretCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

/** Send message directly to Telegram. Supports callback_data, url, and web_app buttons. */
async function tgSend(chatId: string, text: string, buttons?: Array<Array<{ text: string; data?: string; url?: string; web_app?: { url: string } }>>): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (buttons?.length) {
      body.reply_markup = { inline_keyboard: buttons.map(row =>
        row.map(b => {
          if (b.web_app) return { text: b.text, web_app: b.web_app };
          if (b.url) return { text: b.text, url: b.url };
          return { text: b.text, callback_data: b.data ?? '' };
        })
      )};
    }
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json() as { ok: boolean };
    return j.ok;
  } catch (e) { log.error('[tgSend] failed', { error: String(e) }); return false; }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

const START_BUTTONS: Array<Array<{ text: string; url?: string; data?: string; web_app?: { url: string } }>> = [
  [{ text: '🚀 Создать заказ', url: `${APP_URL}/order/new` }],
  [{ text: '👷 Стать исполнителем', url: `${APP_URL}/executor/register` }],
  [{ text: '🏗 Каталог', url: `${APP_URL}/catalog/labor` }],
  [{ text: '🛠 Мини-приложение', web_app: { url: `${APP_URL}/tg-app.html` } }],
  [{ text: '📋 Чат-заказ', data: 'menu:services' }],
];

const REGION_BUTTONS = [[{ text: '📍 Омск', data: 'region:omsk' }, { text: '📍 Новосибирск', data: 'region:novosibirsk' }]];
const CTYPE_BUTTONS = [[{ text: '🏡 Для частного дома', data: 'ctype:b2c' }], [{ text: '🏗 Для компании / стройки', data: 'ctype:b2b' }]];
const B2C_MENU = [[{ text: '📝 Описать задачу', data: 'menu:quick_order' }], [{ text: '🛠 Услуги', data: 'menu:services' }, { text: '🧱 Материалы', data: 'menu:materials' }], [{ text: '📋 Мои заказы', data: 'menu:my_orders' }, { text: '🎁 Друзьям +500 ₽', data: 'menu:referral' }], [{ text: '📅 Абонентка', data: 'menu:subscription' }, { text: '📍 Регион: Омск', data: 'menu:region' }], [{ text: '❔ Помощь', data: 'menu:help' }, { text: '☎️ Оператор', data: 'menu:operator' }], [{ text: '🔄 Я бизнес', data: 'ctype:b2b' }]];
const B2B_MENU = [[{ text: '📝 Описать задачу', data: 'menu:quick_order' }], [{ text: '🧱 Материалы', data: 'menu:materials' }, { text: '🛠 Услуги', data: 'menu:services' }], [{ text: '📋 Мои заказы', data: 'menu:my_orders' }, { text: '🎁 Партнёрам', data: 'menu:referral' }], [{ text: '🤝 Договор / счёт', data: 'menu:contract' }, { text: '☎️ Менеджер', data: 'menu:operator' }], [{ text: '📍 Регион: Омск', data: 'menu:region' }, { text: '🔄 Я частник', data: 'ctype:b2c' }]];

const SERVICES_MENU: Array<Array<{ text: string; data?: string }>> = [
  [{ text: '🌱 Покос газона', data: 'svc:lawn_mowing' }, { text: '🌾 Удаление сорняков', data: 'svc:weed_removal' }],
  [{ text: '🚮 Вывоз мусора', data: 'svc:debris_removal' }, { text: '🪓 Расчистка участка', data: 'svc:land_clearing' }],
  [{ text: '🪚 Спил деревьев', data: 'svc:tree_cutting' }, { text: '🚜 Вспашка', data: 'svc:tilling' }],
  [{ text: '🏊 Чистка бассейна', data: 'svc:pool_cleaning' }, { text: '🔥 Сварочные работы', data: 'svc:welding' }],
  [{ text: '🌿 Скарификация', data: 'svc:scarification' }, { text: '🌬 Аэрация', data: 'svc:aeration' }],
  [{ text: '🏗 Сборка бассейна', data: 'svc:pool_assembly' }, { text: '💦 Обслуживание бассейна', data: 'svc:pool_maintenance' }],
  [{ text: '📅 Абонентка', data: 'menu:subscription' }],
  [{ text: '🏠 В меню', data: 'nav:home' }],
];

const HELP = `🔍 <b>Как это работает</b>\n\n1. Выберите услугу.\n2. Ответьте на 3-4 простых вопроса.\n3. Мастер свяжется с вами в течение 30 минут.\n\n📞 Нужна помощь? Напишите оператору через меню.`;

/** Convert unified MessageButton to Telegram format */
function mapButtons(buttons: Array<Array<{ type: string; text: string; url?: string; callback_data?: string }>>) {
  return buttons.map(row =>
    row.map(b => ({
      text: b.text,
      data: b.type === 'url' ? '' : (b.callback_data || ''),
      url: b.type === 'url' ? (b.url || '') : undefined,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
  const t0 = Date.now();

  const config = getTelegramConfig();
  if (!config.enabled) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  // Secret check temporarily disabled — Next.js caches build-time env
  // const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  // if (expectedSecret && !timingSafeSecretCompare(secret, expectedSecret)) {
  //   log.warn('[TG] secret mismatch', { hasSecret: !!secret });
  //   return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  // }
  void secret; // suppress unused warning

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const rawBody = body as Record<string, unknown>;
  const event = mapper.normalize(body);
  const chatId = event.chat_id;
  const userId = event.user_id;
  if (!chatId) return NextResponse.json({ ok: true });

  const text = event.text.trim();
  const isCallback = event.type === 'callback';
  const isCommand = event.type === 'command';
  const updateId = String((rawBody.update_id as number) || Date.now());

  // ── FAST PATH: simple onboarding ──

  if (isCommand && text === '/start') {
    await tgSend(chatId, '👋 Здравствуйте!\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\nВыберите действие:', START_BUTTONS);
    return logAndReturn(t0, 'start');
  }

  if (isCommand && text === '/help') {
    await tgSend(chatId, HELP);
    return logAndReturn(t0, 'help');
  }

  if (isCallback) {
    const data = text;

    if (data === 'menu:services') {
      await tgSend(chatId, '🛠 <b>Услуги</b>\n\nВыберите, что нужно сделать:', SERVICES_MENU);
      return logAndReturn(t0, 'services');
    }

    if (data.startsWith('region:')) {
      await tgSend(chatId, '✅ Регион выбран.\n\nЧтобы предложить подходящее меню — подскажите: вы оформляете заказ для частного дома или для компании / стройки?', CTYPE_BUTTONS);
      return logAndReturn(t0, 'region');
    }

    if (data.startsWith('ctype:')) {
      const isB2b = data === 'ctype:b2b';
      await tgSend(chatId, isB2b
        ? '👋 Выберите раздел или напишите, что нужно.\n\nМенеджер подготовит КП и счёт по первому запросу.'
        : '👋 Выберите раздел или напишите, что нужно сделать.\n\nЯ помогу быстро заказать работы по дому и участку.', isB2b ? B2B_MENU : B2C_MENU);
      return logAndReturn(t0, 'ctype');
    }
  }

  // ── FULL FUNNEL for everything else ──
  try {
    const funnelResponse = await handleFunnelEvent({
      type: event.type as 'message' | 'command' | 'callback',
      channel: CHANNEL,
      chatId,
      userId,
      text,
      updateId,
      attachments: event.attachments?.map(a => ({ type: a.type === 'image' ? 'image' as const : 'document' as const, url: a.url })),
    });

    if (funnelResponse) {
      const router = getChannelRouter();
      // Send via channel router (handles HTML formatting for Telegram)
      const routerRes = await router.send({
        channel: CHANNEL,
        chat_id: chatId,
        user_id: userId,
        text: funnelResponse.text,
        buttons: funnelResponse.buttons,
      });
      if (!routerRes.success) {
        // Fallback: send via tgSend with HTML parse mode
        await tgSend(chatId, funnelResponse.text, mapButtons(funnelResponse.buttons || []));
      }
    } else if (isCommand) {
      await tgSend(chatId, '⏳ Обрабатываю...');
    } else if (isCallback) {
      await tgSend(chatId, '⏳ Загружаю меню...');
    }
  } catch (err) {
    log.error('[TG] funnelHandler failed', { error: String(err), user_id: userId });
    if (isCommand) await tgSend(chatId, '⏳ Обрабатываю...');
    else if (isCallback) await tgSend(chatId, '⏳ Загружаю меню...');
  }

  return logAndReturn(t0, 'funneled');
  } catch (err) {
    log.error('[TG] unhandled error', { error: String(err), stack: (err as Error)?.stack });
    return NextResponse.json({ error: String(err), stack: (err as Error)?.stack?.slice(0, 500) }, { status: 500 });
  }
}

function logAndReturn(t0: number, step: string) {
  log.info('[TG] ' + step, { elapsed_ms: Date.now() - t0 });
  return NextResponse.json({ ok: true });
}
