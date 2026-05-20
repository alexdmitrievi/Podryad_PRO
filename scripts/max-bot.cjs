// Podryad PRO — Standalone MAX Bot (Long Polling, NO external deps, Node 12+)
var https = require('https');
var http = require('http');

var TOKEN = process.env.MAX_BOT_TOKEN || 'f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN';
var APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.podryadpro.ru';
var API_BASE = 'https://platform-api.max.ru';

var marker = 0;
var running = true;

// ====== HTTP helpers ======

function maxGet(path, query, cb) {
  var qs = query ? '?' + Object.keys(query).map(function(k) { return k + '=' + encodeURIComponent(query[k]); }).join('&') : '';
  var url = API_BASE + path + qs;
  https.get(url, { headers: { Authorization: TOKEN } }, function(res) {
    var body = ''; res.on('data', function(c) { body += c; }); res.on('end', function() { try { cb(null, JSON.parse(body)); } catch(e) { cb(e); } });
  }).on('error', cb);
}

function maxPost(path, query, body, cb) {
  var qs = query ? '?' + Object.keys(query).map(function(k) { return k + '=' + encodeURIComponent(query[k]); }).join('&') : '';
  var fullUrl = API_BASE + path + qs;
  var parsed = require('url').parse(fullUrl);
  var data = JSON.stringify(body);
  var opts = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };
  var req = https.request(opts, function(res) {
    var b = ''; res.on('data', function(c) { b += c; }); res.on('end', function() { try { cb(null, JSON.parse(b)); } catch(e) { cb(e, b); } });
  });
  req.on('error', cb);
  req.write(data); req.end();
}

// ====== Message sending ======

function maxPost(path, query, body, cb) {
  var qs = query ? '?' + Object.keys(query).map(function(k) { return k + '=' + encodeURIComponent(query[k]); }).join('&') : '';
  var fullUrl = API_BASE + path + qs;
  var parsed = require('url').parse(fullUrl);
  var data = JSON.stringify(body);
  var opts = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };
  var req = https.request(opts, function(res) {
    var b = ''; res.on('data', function(c) { b += c; }); res.on('end', function() { try { cb(null, JSON.parse(b)); } catch(e) { cb(e, b); } });
  });
  req.on('error', cb);
  req.write(data); req.end();
}

function sendMessage(chatId, text, extra, cb) {
  cb = cb || function(){};
  var q = { chat_id: String(chatId), user_id: String(chatId) };
  var b = { text: text };
  if (extra) {
    if (extra.attachments) b.attachments = extra.attachments;
    if (extra.format) b.format = extra.format;
    if (extra.link) b.link = extra.link;
    if (extra.notify !== undefined) b.notify = extra.notify;
  }
  maxPost('/messages', q, b, function(err, res) {
    if (err) { log('[sendMessage] Error:', err.message); return; }
    if (res && res.message) { log('[sendMessage] OK:', res.message.body.mid); cb(null, res); }
    else { log('[sendMessage] Fail:', JSON.stringify(res).slice(0,150)); }
  });
}

function answerCallback(callbackId, text) {
  var url = API_BASE + '/answers?callback_id=' + encodeURIComponent(callbackId);
  var parsed = require('url').parse(url);
  var body = {};
  if (text) body.message = { text: text };
  var data = JSON.stringify(body);
  var opts = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };
  var req = https.request(opts, function() {});
  req.on('error', function(){});
  req.write(data); req.end();
}

// ====== Bot logic ======

function handleUpdate(update) {
  var type = update.update_type;
  // Extract chatId: bot_started has it at top level; message_created has it in message.recipient
  var chatId = update.chat_id;
  if (!chatId && update.message && update.message.recipient) {
    chatId = update.message.recipient.chat_id;
  }
  var user = update.user || {};
  var msg = update.message || {};
  var body = msg.body || {};
  var text = (body.text || '').trim();
  var callback = update.callback || {};
  var payload = update.payload || '';

  log('[update] type=' + type + ' chatId=' + chatId + ' text=' + (text || payload || '(none)').slice(0,60));

  if (!chatId) { return; }

  if (type === 'bot_started') {
    var name = user.first_name || '';
    var greeting = name ? '👋 Здравствуйте, ' + name + '!' : '👋 Здравствуйте!';
    
    sendMessage(chatId, greeting + '\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n📍 <b>В каком городе вы находитесь?</b>', { format: 'html' }, function() {
      sendMessage(chatId, 'Выберите город:', {
        attachments: [{ type: 'inline_keyboard', payload: { buttons: [
          [{ type: 'callback', text: '📍 Омск', payload: 'region:omsk' }],
          [{ type: 'callback', text: '📍 Новосибирск', payload: 'region:novosibirsk' }],
        ]}}]
      });
    });
    return;
  }

  if (type === 'message_callback' && callback.payload) {
    var payload = callback.payload;
    var cbId = callback.callback_id;

    if (payload === 'region:omsk') {
      answerCallback(cbId, 'Выбран Омск');
      sendMessage(chatId, '🏙 <b>Омск</b>\n\nЧто вас интересует?', { format: 'html', attachments: [{ type: 'inline_keyboard', payload: { buttons: [
        [{ type: 'callback', text: '🛠 Услуги', payload: 'menu:services:omsk' }],
        [{ type: 'callback', text: '🧱 Материалы', payload: 'menu:materials:omsk' }],
        [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }],
      ]}}] });
      return;
    }
    if (payload === 'region:novosibirsk') {
      answerCallback(cbId, 'Выбран Новосибирск');
      sendMessage(chatId, '🏙 <b>Новосибирск</b>\n\nЧто вас интересует?', { format: 'html', attachments: [{ type: 'inline_keyboard', payload: { buttons: [
        [{ type: 'callback', text: '🛠 Услуги', payload: 'menu:services:nsk' }],
        [{ type: 'callback', text: '🧱 Материалы', payload: 'menu:materials:nsk' }],
        [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }],
      ]}}] });
      return;
    }
    if (payload.indexOf('menu:services:') === 0) {
      answerCallback(cbId);
      sendMessage(chatId, '🛠 <b>Услуги</b>\n\n• Покос газона\n• Расчистка участка\n• Валка деревьев\n• Уборка мусора\n• Земляные работы\n• Уборка снега\n\nДля точного расчёта стоимости опишите задачу.', { format: 'html' });
      return;
    }
    if (payload.indexOf('menu:materials:') === 0) {
      answerCallback(cbId);
      sendMessage(chatId, '🧱 <b>Стройматериалы</b>\n\n• Бетон (M100–M400)\n• Щебень всех фракций\n• Песок (карьерный, речной, мытый)\n• Цемент M400/M500\n• Кирпич\n\nДля заказа напишите, что нужно.', { format: 'html' });
      return;
    }
    answerCallback(cbId);
    return;
  }

  if (type === 'message_created' && text) {
    var cmd = text.split(/\s+/)[0].toLowerCase();

    switch (cmd) {
      case '/start': {
        var name = user.first_name || '';
        var greeting = name ? '👋 Здравствуйте, ' + name + '!' : '👋 Здравствуйте!';
        sendMessage(chatId, greeting + '\n\nЯ — бот «Подряд PRO». Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n📍 <b>В каком городе вы находитесь?</b>', { format: 'html' }, function() {
          sendMessage(chatId, 'Выберите город:', { attachments: [{ type: 'inline_keyboard', payload: { buttons: [
            [{ type: 'callback', text: '📍 Омск', payload: 'region:omsk' }],
            [{ type: 'callback', text: '📍 Новосибирск', payload: 'region:novosibirsk' }],
          ]}}] });
        });
        return;
      }
      case '/help':
        sendMessage(chatId, 'Подряд PRO — платформа для заказа рабочей силы в Омске и Новосибирске.\n\nКоманды:\n/start — приветствие\n/help — справка\n/order — создать заказ\n/status — статус ваших заказов\n/orders — актуальные заказы\n\nПросто напишите, что вам нужно — я помогу!');
        return;
      case '/order':
        sendMessage(chatId, '📋 Оформление заказа\n\nОпишите, что нужно сделать и где. Например:\n«Нужны 2 грузчика на завтра в 10:00, ул. Ленина 15, разгрузить фуру»\n\nЯ передам заказ администратору для расчёта стоимости.');
        return;
      case '/status':
        sendMessage(chatId, '📋 Для проверки статуса заказов перейдите в личный кабинет.', { attachments: [{ type: 'inline_keyboard', payload: { buttons: [[{ type: 'link', text: '🌐 Личный кабинет', url: APP_URL + '/dashboard' }]] }}] });
        return;
      case '/orders':
        sendMessage(chatId, '📋 Актуальные заказы доступны на сайте.', { attachments: [{ type: 'inline_keyboard', payload: { buttons: [[{ type: 'link', text: '🌐 Сайт', url: APP_URL }]] }}] });
        return;
      default: {
        var short = text.length > 100 ? text.slice(0, 100) + '...' : text;
        sendMessage(chatId, 'Спасибо за обращение! Ваш запрос: «' + short + '»\n\nДля оформления заказа перейдите на сайт или в мини-приложение.', {
          attachments: [{ type: 'inline_keyboard', payload: { buttons: [
            [{ type: 'link', text: '🚀 Создать заказ', url: APP_URL + '/order/new' }],
            [{ type: 'link', text: '👷 Стать исполнителем', url: APP_URL + '/executor/register' }],
            [{ type: 'link', text: '🏗 Каталог', url: APP_URL + '/catalog/labor' }],
          ]}}]
        });
      }
    }
  }
}

// ====== Polling ======

function poll() {
  log('[poll] marker=' + marker);
  maxGet('/updates', { marker: String(marker) }, function(err, res) {
    if (err) { log('[poll] Error:', err.message); schedule(); return; }
    
    var updates = res.updates || [];
    if (updates.length > 0) {
      log('[poll] Got ' + updates.length + ' updates');
      updates.forEach(function(u) {
        try { handleUpdate(u); } catch(e) { log('[handle] Error:', e.message); }
      });
    }
    
    if (res.marker) marker = res.marker;
    schedule();
  });
}

function schedule() {
  if (!running) return;
  setTimeout(poll, 5000);
}

function log() {
  var args = Array.prototype.slice.call(arguments);
  console.log(new Date().toISOString(), args.join(' '));
}

// ====== Start ======

log('Starting Podryad PRO MAX Bot (standalone)');
log('Token:', TOKEN.slice(0,8) + '...');
maxGet('/me', {}, function(err, bot) {
  if (err) { log('Failed to get bot info:', err.message); process.exit(1); }
  log('Bot:', bot.first_name, '@' + bot.username, 'ID:', bot.user_id);
  poll();
});

process.on('SIGINT', function() { log('Stopping...'); running = false; });
process.on('SIGTERM', function() { log('Stopping...'); running = false; });
