// Podryad PRO — MAX Bot (Long Polling via official MAX Bot API)
// Run on VPS: node max-bot.mjs

import { Bot } from '@maxhub/max-bot-api';

const TOKEN = process.env.MAX_BOT_TOKEN || 'f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.podryadpro.ru';

if (!TOKEN) {
  console.error('MAX_BOT_TOKEN not set');
  process.exit(1);
}

const bot = new Bot(TOKEN);

// ── Commands ──

bot.command('start', async (ctx) => {
  const name = ctx.user?.first_name || '';
  const greeting = name ? `👋 Здравствуйте, ${name}!` : '👋 Здравствуйте!';
  
  await ctx.reply(
    `${greeting}\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n📍 <b>В каком городе вы находитесь?</b>`,
    { format: 'html' }
  );
  
  // Send city selection buttons
  await ctx.reply('Выберите город:', {
    attachments: [{
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '📍 Омск', payload: 'region:omsk' }],
          [{ type: 'callback', text: '📍 Новосибирск', payload: 'region:novosibirsk' }],
        ],
      },
    }],
  });
});

bot.command('help', (ctx) => {
  return ctx.reply(
    `Подряд PRO — платформа для заказа рабочей силы в Омске и Новосибирске.\n\nКоманды:\n/start — приветствие\n/help — справка\n/order — создать заказ\n/status — статус ваших заказов\n/link — привязать аккаунт к номеру телефона\n/orders — актуальные заказы (для исполнителей)\n\nПросто напишите, что вам нужно — я помогу!`
  );
});

bot.command('order', async (ctx) => {
  await ctx.reply(
    '📋 Оформление заказа\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.'
  );
});

bot.command('status', async (ctx) => {
  await ctx.reply(
    '📋 Для проверки статуса заказов перейдите в личный кабинет на сайте.',
    {
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [[{ type: 'link', text: '🌐 Личный кабинет', url: `${APP_URL}/dashboard` }]],
        },
      }],
    }
  );
});

bot.command('link', async (ctx) => {
  await ctx.reply(
    '🔗 Чтобы привязать аккаунт, перейдите на сайт и авторизуйтесь по номеру телефона.',
    {
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [[{ type: 'link', text: '🌐 Сайт', url: APP_URL }]],
        },
      }],
    }
  );
});

// ── Callback handlers ──

bot.action('region:omsk', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Выбран Омск' });
  await ctx.reply(
    '🏙 <b>Омск</b>\n\nЧто вас интересует?',
    {
      format: 'html',
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '🛠 Услуги', payload: 'menu:services:omsk' }],
            [{ type: 'callback', text: '🧱 Материалы', payload: 'menu:materials:omsk' }],
            [{ type: 'link', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` }],
          ],
        },
      }],
    }
  );
});

bot.action('region:novosibirsk', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Выбран Новосибирск' });
  await ctx.reply(
    '🏙 <b>Новосибирск</b>\n\nЧто вас интересует?',
    {
      format: 'html',
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '🛠 Услуги', payload: 'menu:services:nsk' }],
            [{ type: 'callback', text: '🧱 Материалы', payload: 'menu:materials:nsk' }],
            [{ type: 'link', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` }],
          ],
        },
      }],
    }
  );
});

bot.action(/menu:services:(.+)/, async (ctx) => {
  await ctx.answerOnCallback({});
  await ctx.reply(
    '🛠 <b>Услуги</b>\n\n• Покос газона\n• Расчистка участка\n• Валка деревьев\n• Уборка мусора\n• Земляные работы\n• Уборка снега\n\nДля точного расчёта стоимости опишите задачу.',
    { format: 'html' }
  );
});

bot.action(/menu:materials:(.+)/, async (ctx) => {
  await ctx.answerOnCallback({});
  await ctx.reply(
    '🧱 <b>Стройматериалы</b>\n\n• Бетон (M100–M400)\n• Щебень всех фракций\n• Песок (карьерный, речной, мытый)\n• Цемент M400/M500\n• Кирпич\n\nДля заказа напишите, что нужно.',
    { format: 'html' }
  );
});

// ── Free text → redirect to PWA ──

bot.on('message_created', async (ctx) => {
  const text = ctx.message?.body?.text?.trim();
  if (!text) return;
  
  // Skip commands (already handled above)
  if (text.startsWith('/')) return;
  
  await ctx.reply(
    `Спасибо за обращение! Для быстрого оформления заказа перейдите на сайт или в мини-приложение.\n\nВаш запрос: «${text.slice(0, 100)}${text.length > 100 ? '...' : ''}»`,
    {
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'link', text: '🚀 Создать заказ', url: `${APP_URL}/order/new` }],
            [{ type: 'link', text: '👷 Стать исполнителем', url: `${APP_URL}/executor/register` }],
            [{ type: 'url', text: '🏗 Каталог', url: `${APP_URL}/catalog/labor` }],
          ],
        },
      }],
    }
  );
});

// ── Start ──

console.log('Starting Podryad PRO MAX bot...');
bot.start()
  .then(() => console.log('Bot is running — Long Polling active'))
  .catch((err) => {
    console.error('Bot start failed:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => { console.log('Stopping...'); bot.stop(); });
process.once('SIGTERM', () => { console.log('Stopping...'); bot.stop(); });
