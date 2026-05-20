// Podryad PRO — MAX Bot (Long Polling via official MAX Bot API)
// Compatible with Node 12+

var Bot = require('@maxhub/max-bot-api').Bot;

var TOKEN = process.env.MAX_BOT_TOKEN || 'f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN';
var APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.podryadpro.ru';

if (!TOKEN) {
  console.error('MAX_BOT_TOKEN not set');
  process.exit(1);
}

var bot = new Bot(TOKEN);

// ── /start ──
bot.command('start', function(ctx) {
  var user = ctx.user || {};
  var name = user.first_name || '';
  var greeting = name ? '👋 Здравствуйте, ' + name + '!' : '👋 Здравствуйте!';
  
  return ctx.reply(
    greeting + '\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n📍 <b>В каком городе вы находитесь?</b>',
    { format: 'html' }
  ).then(function() {
    return ctx.reply('Выберите город:', {
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
});

// ── /help ──
bot.command('help', function(ctx) {
  return ctx.reply(
    'Подряд PRO — платформа для заказа рабочей силы в Омске и Новосибирске.\n\n' +
    'Команды:\n' +
    '/start — приветствие\n' +
    '/help — справка\n' +
    '/order — создать заказ\n' +
    '/status — статус ваших заказов\n' +
    '/link — привязать аккаунт к номеру телефона\n' +
    '/orders — актуальные заказы (для исполнителей)\n\n' +
    'Просто напишите, что вам нужно — я помогу!'
  );
});

// ── /order ──
bot.command('order', function(ctx) {
  return ctx.reply(
    '📋 Оформление заказа\n\n' +
    'Опишите, что нужно сделать и где. Например:\n' +
    '«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\n' +
    'Я передам заказ администратору для расчёта стоимости.'
  );
});

// ── /status ──
bot.command('status', function(ctx) {
  return ctx.reply(
    '📋 Для проверки статуса заказов перейдите в личный кабинет на сайте.',
    {
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [[{ type: 'link', text: '🌐 Личный кабинет', url: APP_URL + '/dashboard' }]],
        },
      }],
    }
  );
});

// ── /link ──
bot.command('link', function(ctx) {
  return ctx.reply(
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

// ── Region callbacks ──
bot.action('region:omsk', function(ctx) {
  return ctx.answerOnCallback({ notification: 'Выбран Омск' }).then(function() {
    return ctx.reply(
      '🏙 <b>Омск</b>\n\nЧто вас интересует?',
      {
        format: 'html',
        attachments: [{
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '🛠 Услуги', payload: 'menu:services:omsk' }],
              [{ type: 'callback', text: '🧱 Материалы', payload: 'menu:materials:omsk' }],
              [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }],
            ],
          },
        }],
      }
    );
  });
});

bot.action('region:novosibirsk', function(ctx) {
  return ctx.answerOnCallback({ notification: 'Выбран Новосибирск' }).then(function() {
    return ctx.reply(
      '🏙 <b>Новосибирск</b>\n\nЧто вас интересует?',
      {
        format: 'html',
        attachments: [{
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '🛠 Услуги', payload: 'menu:services:nsk' }],
              [{ type: 'callback', text: '🧱 Материалы', payload: 'menu:materials:nsk' }],
              [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }],
            ],
          },
        }],
      }
    );
  });
});

// ── Service menus ──
function onServices(region) {
  return function(ctx) {
    return ctx.answerOnCallback({}).then(function() {
      return ctx.reply(
        '🛠 <b>Услуги</b>\n\n• Покос газона\n• Расчистка участка\n• Валка деревьев\n• Уборка мусора\n• Земляные работы\n• Уборка снега\n\nДля точного расчёта стоимости опишите задачу.',
        { format: 'html' }
      );
    });
  };
}
bot.action(/menu:services:(.+)/, onServices);

function onMaterials(region) {
  return function(ctx) {
    return ctx.answerOnCallback({}).then(function() {
      return ctx.reply(
        '🧱 <b>Стройматериалы</b>\n\n• Бетон (M100–M400)\n• Щебень всех фракций\n• Песок (карьерный, речной, мытый)\n• Цемент M400/M500\n• Кирпич\n\nДля заказа напишите, что нужно.',
        { format: 'html' }
      );
    });
  };
}
bot.action(/menu:materials:(.+)/, onMaterials);

// ── Free text → info ──
bot.on('message_created', function(ctx) {
  var message = ctx.message;
  if (!message) return;
  var body = message.body;
  if (!body) return;
  var text = (body.text || '').trim();
  if (!text) return;
  if (text.charAt(0) === '/') return;
  
  var short = text.length > 100 ? text.slice(0, 100) + '...' : text;
  
  return ctx.reply(
    'Спасибо за обращение! Для быстрого оформления заказа перейдите на сайт или в мини-приложение.\n\n' +
    'Ваш запрос: «' + short + '»',
    {
      attachments: [{
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }],
            [{ type: 'link', text: '👷 Стать исполнителем', url: APP_URL + '/executor/register' }],
            [{ type: 'link', text: '🏗 Каталог', url: APP_URL + '/catalog/labor' }],
          ],
        },
      }],
    }
  );
});

// ── Start ──
console.log('Starting Podryad PRO MAX bot...');
bot.start()
  .then(function() { console.log('Bot is running — Long Polling active'); })
  .catch(function(err) { console.error('Bot start failed:', err); process.exit(1); });

process.on('SIGINT', function() { console.log('Stopping...'); bot.stop(); });
process.on('SIGTERM', function() { console.log('Stopping...'); bot.stop(); });
