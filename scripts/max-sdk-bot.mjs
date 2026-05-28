import { Bot, Keyboard } from '@maxhub/max-bot-api';

const TOKEN = 'f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN';
const APP_URL = 'https://podryadpro.ru';

const bot = new Bot(TOKEN);

console.log('[SDK] Bot created, starting...');

bot.use(async (ctx, next) => {
  const text = ctx.message?.body?.text || '';
  console.log('[SDK] MSG:', ctx.update?.update_type, text.slice(0, 80));
  return next();
});

const startKbd = Keyboard.inlineKeyboard([
  [Keyboard.button.link('🚀 Создать заказ', APP_URL + '/order/new'),
   Keyboard.button.link('👷 Стать исполнителем', APP_URL + '/executor/register')],
  [Keyboard.button.link('🏗 Каталог', APP_URL + '/catalog/labor')],
  [Keyboard.button.openApp('🛠 Мини-приложение', APP_URL + '/max-app')],
]);

bot.command('start', async (ctx) => {
  console.log('[SDK] /start handler');
  await ctx.reply('Привет! Я — бот Подряд PRO. Выберите действие:', {
    attachments: [startKbd],
  });
  console.log('[SDK] /start OK');
});

bot.command('старт', async (ctx) => {
  console.log('[SDK] /старт handler');
  await ctx.reply('Привет! Я — бот Подряд PRO. Выберите действие:', {
    attachments: [startKbd],
  });
  console.log('[SDK] /старт OK');
});

bot.catch(err => console.error('[SDK] Bot error:', err.message, err.stack));

const info = await bot.api.getMyInfo();
console.log('[SDK] Bot:', info.first_name, 'ID:', info.user_id);
bot.start();
console.log('[SDK] Long polling started');
