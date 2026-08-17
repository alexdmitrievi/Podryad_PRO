import { Bot } from '@maxhub/max-bot-api';

const TOKEN = process.env.MAX_BOT_TOKEN || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

if (!TOKEN) {
  console.error('[SDK] MAX_BOT_TOKEN is not set — exiting');
  process.exit(1);
}

const bot = new Bot(TOKEN);

console.log('[SDK] Bot created, starting...');

bot.use(async (ctx, next) => {
  const text = ctx.message?.body?.text || '';
  console.log('[SDK] MSG:', ctx.update?.update_type, text.slice(0, 80));
  return next();
});

const startKbd = {
  type: 'inline_keyboard',
  payload: {
    buttons: [
      [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' },
       { type: 'link', text: '👷 Стать исполнителем', url: APP_URL + '/executor/register' }],
      [{ type: 'link', text: '🏗 Каталог', url: APP_URL + '/catalog/labor' }],
      [{ type: 'link', text: '🛠 Мини-приложение', url: APP_URL + '/max-app.html' }],
    ],
  },
};

const START_TEXT = 'Привет! Я — бот Подряд PRO. Выберите действие:';

const HELP_TEXT = 'Подряд PRO — платформа для заказа рабочей силы в Омске и Новосибирске.\n\nКоманды:\n/start — приветствие\n/help — справка\n\nИли просто воспользуйтесь кнопками меню.';

bot.command('start', async (ctx) => {
  console.log('[SDK] /start handler');
  await ctx.reply(START_TEXT, { attachments: [startKbd] });
  console.log('[SDK] /start OK');
});

bot.command('старт', async (ctx) => {
  console.log('[SDK] /старт handler');
  await ctx.reply(START_TEXT, { attachments: [startKbd] });
  console.log('[SDK] /старт OK');
});

bot.command('help', async (ctx) => {
  console.log('[SDK] /help handler');
  await ctx.reply(HELP_TEXT, { attachments: [startKbd] });
});

bot.command('помощь', async (ctx) => {
  console.log('[SDK] /помощь handler');
  await ctx.reply(HELP_TEXT, { attachments: [startKbd] });
});

bot.catch(err => console.error('[SDK] Bot error:', err.message, err.stack));

const info = await bot.api.getMyInfo();
console.log('[SDK] Bot:', info.first_name, 'ID:', info.user_id);
bot.start();
console.log('[SDK] Long polling started');
