import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { TelegramMapper } from '@/lib/channels/telegram';
import { log } from '@/lib/logger';
import { getTelegramConfig } from '@/lib/channels/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNEL = 'telegram' as const;
const mapper = new TelegramMapper();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function timingSafeSecretCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

/** Send message directly to Telegram — NO Supabase, NO background, just HTTP. */
async function tgSend(chatId: string, text: string, buttons?: Array<Array<{ text: string; data: string }>>): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (buttons?.length) {
      body.reply_markup = { inline_keyboard: buttons.map(row => row.map(b => ({ text: b.text, callback_data: b.data }))) };
    }
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json() as { ok: boolean };
    return j.ok;
  } catch (e) { log.error('[tgSend] failed', { error: String(e) }); return false; }
}

const REGION_BUTTONS = [[{ text: '📍 Омск', data: 'region:omsk' }, { text: '📍 Новосибирск', data: 'region:novosibirsk' }]];
const CTYPE_BUTTONS = [[{ text: '🏡 Для частного дома', data: 'ctype:b2c' }], [{ text: '🏗 Для компании / стройки', data: 'ctype:b2b' }]];
const B2C_MENU = [[{ text: '📝 Описать задачу', data: 'menu:quick_order' }], [{ text: '🛠 Услуги', data: 'menu:services' }, { text: '🧱 Материалы', data: 'menu:materials' }], [{ text: '📋 Мои заказы', data: 'menu:my_orders' }, { text: '🎁 Друзьям +500 ₽', data: 'menu:referral' }], [{ text: '📅 Абонентка', data: 'menu:subscription' }, { text: '📍 Регион: Омск', data: 'menu:region' }], [{ text: '❔ Помощь', data: 'menu:help' }, { text: '☎️ Оператор', data: 'menu:operator' }], [{ text: '🔄 Я бизнес', data: 'ctype:b2b' }]];
const B2B_MENU = [[{ text: '📝 Описать задачу', data: 'menu:quick_order' }], [{ text: '🧱 Материалы', data: 'menu:materials' }, { text: '🛠 Услуги', data: 'menu:services' }], [{ text: '📋 Мои заказы', data: 'menu:my_orders' }, { text: '🎁 Партнёрам', data: 'menu:referral' }], [{ text: '🤝 Договор / счёт', data: 'menu:contract' }, { text: '☎️ Менеджер', data: 'menu:operator' }], [{ text: '📍 Регион: Омск', data: 'menu:region' }, { text: '🔄 Я частник', data: 'ctype:b2c' }]];

const HELP = `🔍 <b>Как это работает</b>\n\n1. Выберите услугу.\n2. Ответьте на 3-4 простых вопроса.\n3. Мастер свяжется с вами в течение 30 минут.\n\n📞 Нужна помощь? Напишите оператору через меню.`;

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  const config = getTelegramConfig();
  if (!config.enabled) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && !timingSafeSecretCompare(secret, expectedSecret)) {
    log.warn('[TG] secret mismatch');
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const rawBody = body as Record<string, unknown>;
  const event = mapper.normalize(body);
  const chatId = event.chat_id;
  if (!chatId) return NextResponse.json({ ok: true });

  const text = event.text.trim();
  const isCallback = event.type === 'callback';
  const isCommand = event.type === 'command';

  // ── IMMEDIATE RESPONSE — no Supabase, no waitUntil, no background ──

  if (isCommand && text === '/start') {
    await tgSend(chatId, '👋 Здравствуйте!\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n📍 <b>В каком городе вы находитесь?</b>', REGION_BUTTONS);
    return logAndReturn(t0, 'start');
  }

  if (isCommand && text === '/help') {
    await tgSend(chatId, HELP);
    return logAndReturn(t0, 'help');
  }

  if (isCallback) {
    const data = text; // callback_data is in event.text

    if (data.startsWith('region:')) {
      await tgSend(chatId, '✅ Регион выбран.\n\nЧтобы предложить подходящее меню — подскажите: вы оформляете заказ для частного дома или для компании / стройки?', CTYPE_BUTTONS);
      return logAndReturn(t0, 'region');
    }

    if (data.startsWith('ctype:')) {
      const isB2b = data === 'ctype:b2b';
      const menu = isB2b ? B2B_MENU : B2C_MENU;
      await tgSend(chatId, isB2b
        ? '👋 Выберите раздел или напишите, что нужно.\n\nМенеджер подготовит КП и счёт по первому запросу.'
        : '👋 Выберите раздел или напишите, что нужно сделать.\n\nЯ помогу быстро заказать работы по дому и участку.', menu);
      return logAndReturn(t0, 'ctype');
    }

    if (data === 'menu:quick_order') {
      await tgSend(chatId, '📝 <b>Опишите задачу</b>\n\nНапишите, что нужно сделать, какой объём и когда.\n<i>Например: «Покосить газон, 10 соток, завтра»</i>', [[{ text: '◀️ Назад', data: 'nav:home' }]]);
      return logAndReturn(t0, 'quick');
    }

    if (data === 'menu:help') {
      await tgSend(chatId, HELP, [[{ text: '🏠 В меню', data: 'nav:home' }]]);
      return logAndReturn(t0, 'help');
    }

    if (data === 'menu:operator' || data === 'menu:contract') {
      await tgSend(chatId, '📞 Напишите, что вас интересует — и оставьте номер. Перезвоним в течение 30 минут (9:00–21:00).', [[{ text: '🏠 В меню', data: 'nav:home' }]]);
      return logAndReturn(t0, 'operator');
    }

    if (data === 'nav:home') {
      await tgSend(chatId, '🏠 Главное меню.', B2C_MENU);
      return logAndReturn(t0, 'home');
    }
  }

  // ── Fallback for other messages (free text, complex callbacks) ──
  //     Return 200 quickly. Complex processing moved to a separate lightweight handler.
  log.info('[TG] unhandled fast path', { type: event.type, text: text.slice(0, 50), elapsed_ms: Date.now() - t0 });

  if (isCommand) {
    await tgSend(chatId, '⏳ Обрабатываю...');
  }

  return logAndReturn(t0, 'fallback');
}

function logAndReturn(t0: number, step: string) {
  log.info('[TG] ' + step, { elapsed_ms: Date.now() - t0 });
  return NextResponse.json({ ok: true });
}
