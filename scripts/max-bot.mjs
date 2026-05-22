// Podryad PRO — MAX Bot (official @maxhub/max-bot-api)
// Handles commands locally; forwards complex messages to Vercel
// Run on VPS: node scripts/max-bot.mjs

import { Bot } from '@maxhub/max-bot-api';

console.log('[MAX Bot] Starting...');

const TOKEN = process.env.MAX_BOT_TOKEN || 'f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN';
const WEBHOOK_URL = process.env.MAX_WEBHOOK_URL || 'https://podryad-pro-kohl.vercel.app/api/max/webhook';
const APP_URL = 'https://podryadpro.ru';

const bot = new Bot(TOKEN);

const HELP_TEXT = `Подряд PRO — платформа для заказа рабочей силы.

Команды:
/старт — приветствие
/помощь — справка
/заказ — создать заказ
/статус — статус заказов
/заказы — все заказы`;

// Set command hints
bot.api.setMyCommands([
  { name: 'старт', description: '🚀 Начать работу' },
  { name: 'помощь', description: '❓ Помощь' },
  { name: 'заказ', description: '📋 Создать заказ' },
  { name: 'статус', description: '📊 Статус заказов' },
  { name: 'заказы', description: '📦 Все заказы' },
]).catch(() => {});

// Debug — log all inbound messages
bot.use(async (ctx, next) => {
  const text = ctx.message?.body?.text || '';
  console.log('[MSG]', ctx.update.update_type, text.slice(0, 80));
  return next();
});

// Fast local commands — Russian
bot.command('старт', async (ctx) => {
  await ctx.reply('Привет! Я — бот сервиса Подряд PRO 🏗️\n\nМы помогаем найти:\n• Рабочих (грузчики, разнорабочие, строители)\n\nНапишите, что вам нужно, или используйте кнопки ниже.', {
    attachments: [{
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }, { type: 'link', text: '👷 Стать исполнителем', url: APP_URL + '/executor/register' }],
          [{ type: 'link', text: '🏗 Каталог', url: APP_URL + '/catalog/labor' }],
        ]
      }
    }]
  });
});

bot.command('помощь', async (ctx) => {
  await ctx.reply(HELP_TEXT);
});

bot.command('заказ', async (ctx) => {
  await ctx.reply('📋 Оформление заказа\n\nОпишите, что нужно сделать и где.');
});

// Forward complex / unknown messages to Vercel
bot.on('message_created', async (ctx) => {
  const text = ctx.message.body.text || '';
  if (text.startsWith('/start') || text.startsWith('/help') || text.startsWith('/order')) return;
  if (text.startsWith('/старт') || text.startsWith('/помощь') || text.startsWith('/заказ')) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctx.update),
    });
  } catch {}
});

bot.on('message_callback', async (ctx) => {
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctx.update),
    });
  } catch {}
});

bot.on('bot_started', async (ctx) => {
  await ctx.reply('Привет! Отправь /старт чтобы начать.');
});

bot.catch((err) => {
  console.error('Bot error:', err.message);
});

try {
  const info = await bot.api.getMyInfo();
  console.log('[MAX Bot] Bot:', info.first_name, '@' + info.username, 'ID:', info.user_id);
} catch (err) {
  console.error('[MAX Bot] Failed to get bot info:', err.message);
  process.exit(1);
}

// Start long polling (never resolves — runs forever)
bot.start();
console.log('[MAX Bot] Long Polling started');
