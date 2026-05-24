// Podryad PRO — Telegram Long Poll Proxy (VPS → Vercel webhook)
// Polls Telegram /getUpdates, forwards each event to Vercel webhook for funnel processing
// Node 12+ compatible, zero external dependencies
// Run on VPS: node scripts/telegram-poll.cjs

var https = require('https');

var TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
var WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'https://podryad-pro-kohl.vercel.app/api/telegram/webhook';
var WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
var API_BASE = 'https://api.telegram.org';
var APP_URL = 'https://podryad-pro-kohl.vercel.app';

var offset = 0;
var running = true;

// ====== HTTP helpers ======

function tgGet(path, query, cb) {
  var qs = '';
  if (query) {
    var pairs = [];
    Object.keys(query).forEach(function(k) { pairs.push(k + '=' + encodeURIComponent(query[k])); });
    qs = '?' + pairs.join('&');
  }
  var u = API_BASE + '/bot' + TOKEN + path + qs;
  https.get(u, function(res) {
    var body = '';
    res.on('data', function(c) { body += c; });
    res.on('end', function() {
      try { cb(null, JSON.parse(body)); }
      catch(e) { cb(e); }
    });
  }).on('error', cb);
}

function tgPost(path, body, cb) {
  var data = JSON.stringify(body);
  var req = https.request({
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot' + TOKEN + path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, function(res) {
    var b = '';
    res.on('data', function(c) { b += c; });
    res.on('end', function() {
      try { cb(null, JSON.parse(b)); }
      catch(e) { cb(null, { raw: b }); }
    });
  });
  req.on('error', function(e) { cb(e); });
  req.write(data);
  req.end();
}

function postJSON(targetUrl, body, headers, cb) {
  // Parse URL manually (Node 12+ compatible, no URL constructor needed for relative)
  var match = targetUrl.match(/^https?:\/\/([^\/]+)(\/.*)$/);
  if (!match) { cb(new Error('Bad URL: ' + targetUrl)); return; }
  var hostname = match[1];
  var path = match[2];
  var data = JSON.stringify(body);
  var allHeaders = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
  if (headers) Object.keys(headers).forEach(function(k) { allHeaders[k] = headers[k]; });

  var req = https.request({
    hostname: hostname,
    port: 443,
    path: path,
    method: 'POST',
    headers: allHeaders
  }, function(res) {
    var b = '';
    res.on('data', function(c) { b += c; });
    res.on('end', function() { cb(null, res.statusCode, b); });
  });
  req.on('error', cb);
  req.write(data);
  req.end();
}

// ====== Local fast-reply for simple commands ======

function extractChatId(update) {
  var msg = update.message;
  var cbq = update.callback_query;
  if (cbq && cbq.message) return String(cbq.message.chat && cbq.message.chat.id ? cbq.message.chat.id : '');
  if (msg && msg.chat) return String(msg.chat.id || '');
  return '';
}

function extractText(update) {
  var msg = update.message;
  var cbq = update.callback_query;
  if (cbq && cbq.data) return String(cbq.data);
  if (msg && msg.text) return String(msg.text).trim();
  return '';
}

function isCallback(update) {
  return !!update.callback_query;
}

function isCommand(update) {
  var text = extractText(update);
  return text.startsWith('/') && !isCallback(update);
}

function sendMessage(chatId, text, buttons, cb) {
  var body = { chat_id: chatId, text: text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (buttons && buttons.length) {
    body.reply_markup = { inline_keyboard: buttons };
  }
  tgPost('/sendMessage', body, function(err, res) {
    if (cb) cb(err, res);
  });
}

var HELP_TEXT = '\uD83D\uDD0D <b>\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442</b>\n\n1. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443.\n2. \u041E\u0442\u0432\u0435\u0442\u044C\u0442\u0435 \u043D\u0430 3-4 \u043F\u0440\u043E\u0441\u0442\u044B\u0445 \u0432\u043E\u043F\u0440\u043E\u0441\u0430.\n3. \u041C\u0430\u0441\u0442\u0435\u0440 \u0441\u0432\u044F\u0436\u0435\u0442\u0441\u044F \u0441 \u0432\u0430\u043C\u0438 \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 30 \u043C\u0438\u043D\u0443\u0442.\n\n\uD83D\uDCDE \u041D\u0443\u0436\u043D\u0430 \u043F\u043E\u043C\u043E\u0449\u044C? \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0443 \u0447\u0435\u0440\u0435\u0437 \u043C\u0435\u043D\u044E.';

var REGION_BUTTONS = [
  [{ text: '\uD83D\uDCCD \u041E\u043C\u0441\u043A', callback_data: 'region:omsk' }, { text: '\uD83D\uDCCD \u041D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A', callback_data: 'region:novosibirsk' }]
];

function handleLocal(update) {
  var text = extractText(update);
  var chatId = extractChatId(update);
  if (!chatId || !text) return false;

  if (isCallback(update)) return false; // always forward callbacks to Vercel

  if (text === '/start') {
    sendMessage(chatId, '\uD83D\uDC4B \u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435!\n\n\u042F \u2014 \u0431\u043E\u0442 \u00AB\u041F\u043E\u0434\u0440\u044F\u0434 PRO\u00BB. \u041F\u043E\u043C\u043E\u0433\u0430\u044E \u0431\u044B\u0441\u0442\u0440\u043E \u0437\u0430\u043A\u0430\u0437\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u044B \u043F\u043E \u0434\u043E\u043C\u0443 \u0438 \u0443\u0447\u0430\u0441\u0442\u043A\u0443, \u0441\u0442\u0440\u043E\u0439\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B.\n\n\uD83D\uDCCD <b>\u0412 \u043A\u0430\u043A\u043E\u043C \u0433\u043E\u0440\u043E\u0434\u0435 \u0432\u044B \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0435\u0441\u044C?</b>', REGION_BUTTONS);
    return true;
  }

  if (text === '/help') {
    sendMessage(chatId, HELP_TEXT);
    return true;
  }

  return false;
}

// ====== Polling ======

function poll() {
  log('[poll] offset=' + offset);
  tgGet('/getUpdates', { offset: String(offset), timeout: 30 }, function(err, res) {
    if (err) {
      log('[poll] Error:', err.message);
      schedule(3000);
      return;
    }

    if (!res.ok) {
      log('[poll] API error:', JSON.stringify(res));
      schedule(5000);
      return;
    }

    var updates = res.result || [];
    if (updates.length > 0) {
      log('[poll] Got ' + updates.length + ' updates');
      processUpdates(updates, 0);
    } else {
      schedule(0);
    }
  });
}

function processUpdates(updates, index) {
  if (!running) return;
  if (index >= updates.length) { schedule(0); return; }

  var update = updates[index];
  var updateId = update.update_id;

  if (updateId >= offset) {
    offset = updateId + 1;
  }

  var cbid = update.callback_query ? update.callback_query.id : '';
  var text = extractText(update).slice(0, 60);
  var kind = isCallback(update) ? 'cb' : (isCommand(update) ? 'cmd' : 'msg');

  if (handleLocal(update)) {
    log('[local] ' + kind + ' "' + text + '"');
    if (cbid) tgPost('/answerCallbackQuery', { callback_query_id: cbid }, function(){});
    processUpdates(updates, index + 1);
    return;
  }

  // Answer callback query immediately so button stops spinning
  if (cbid) {
    tgPost('/answerCallbackQuery', { callback_query_id: cbid }, function(){});
  }

  postJSON(WEBHOOK_URL, update, { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET }, function(err, status, body) {
    if (err) {
      log('[fwd] ' + kind + ' Error:', err.message);
    } else if (status !== 200) {
      log('[fwd] ' + kind + ' HTTP ' + status + ': ' + body.slice(0, 100));
    } else {
      log('[fwd] ' + kind + ' OK "' + text + '"');
    }
    processUpdates(updates, index + 1);
  });
}

function schedule(delay) {
  if (!running) return;
  setTimeout(poll, delay || 0);
}

// ====== Logging ======

function log() {
  var args = Array.prototype.slice.call(arguments);
  console.log(new Date().toISOString(), args.join(' '));
}

// ====== Start ======

log('Starting Podryad PRO Telegram Poll Proxy');
log('Token:', TOKEN ? TOKEN.slice(0, 8) + '...' : 'NOT SET');
log('Webhook:', WEBHOOK_URL);
log('Secret:', WEBHOOK_SECRET ? 'configured' : 'NOT SET');

if (!TOKEN) {
  log('ERROR: TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

tgGet('/getMe', {}, function(err, bot) {
  if (err) {
    log('Failed to get bot info:', err.message);
    process.exit(1);
  }

  if (!bot.ok) {
    log('Failed to get bot info:', JSON.stringify(bot));
    process.exit(1);
  }

  log('Bot:', bot.result.first_name, '@' + bot.result.username, 'ID:', bot.result.id);

  // Delete webhook so long-polling receives updates exclusively
  tgPost('/deleteWebhook', { drop_pending_updates: false }, function(err, res) {
    if (err) {
      log('[webhook] Delete error:', err.message);
    } else if (res.ok) {
      log('[webhook] Deleted. Long-polling will now receive updates.');
    } else {
      log('[webhook] Delete response:', JSON.stringify(res));
    }

    // Set bot commands menu
    var commands = {
      commands: [
        { command: 'start', description: '\uD83D\uDE80 \u041D\u0430\u0447\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443' },
        { command: 'help', description: '\u2753 \u041F\u043E\u043C\u043E\u0449\u044C' }
      ]
    };
    tgPost('/setMyCommands', commands, function(cErr, cRes) {
      if (cErr) log('[commands] Error:', cErr.message);
      else log('[commands] Set');
    });

    poll();
  });
});

process.on('SIGINT', function() { log('Stopping...'); running = false; });
process.on('SIGTERM', function() { log('Stopping...'); running = false; });
