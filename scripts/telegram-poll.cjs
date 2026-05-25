// Podryad PRO — Telegram Long Poll Proxy (VPS → Vercel webhook)
// Handles menu navigation locally; forwards service/order callbacks to Vercel
// Node 12+ compatible, zero external dependencies
// Run on VPS: node scripts/telegram-poll.cjs

var https = require('https');

var TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
var WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'http://localhost:3000/api/telegram/webhook';
var WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
var API_BASE = 'https://api.telegram.org';
var offset = 0;
var running = true;

// ── HTTP helpers ──

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
    hostname: 'api.telegram.org', port: 443,
    path: '/bot' + TOKEN + path, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, function(res) {
    var b = '';
    res.on('data', function(c) { b += c; });
    res.on('end', function() {
      try { cb(null, JSON.parse(b)); }
      catch(e) { cb(null, { raw: b }); }
    });
  });
  req.on('error', function(e) { cb(e); });
  req.write(data); req.end();
}

function postJSON(targetUrl, body, headers, cb) {
  var match = targetUrl.match(/^https?:\/\/([^\/]+)(\/.*)$/);
  if (!match) { cb(new Error('Bad URL: ' + targetUrl)); return; }
  var hostname = match[1], path = match[2];
  var data = JSON.stringify(body);
  var allHeaders = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
  if (headers) Object.keys(headers).forEach(function(k) { allHeaders[k] = headers[k]; });
  var req = https.request({ hostname: hostname, port: 443, path: path, method: 'POST', headers: allHeaders }, function(res) {
    var b = '';
    res.on('data', function(c) { b += c; });
    res.on('end', function() { cb(null, res.statusCode, b); });
  });
  req.on('error', cb);
  req.write(data); req.end();
}

// ── Extract helpers ──

function extractChatId(update) {
  var msg = update.message, cbq = update.callback_query;
  if (cbq && cbq.message) return String(cbq.message.chat && cbq.message.chat.id ? cbq.message.chat.id : '');
  if (msg && msg.chat) return String(msg.chat.id || '');
  return '';
}

function extractText(update) {
  var msg = update.message, cbq = update.callback_query;
  if (cbq && cbq.data) return String(cbq.data);
  if (msg && msg.text) return String(msg.text).trim();
  return '';
}

function isCallback(update) { return !!update.callback_query; }

function isCommand(update) {
  var text = extractText(update);
  return text.startsWith('/') && !isCallback(update);
}

function sendMessage(chatId, text, buttons, cb) {
  var body = { chat_id: chatId, text: text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (buttons && buttons.length) body.reply_markup = { inline_keyboard: buttons };
  tgPost('/sendMessage', body, function(err, res) { if (cb) cb(err, res); });
}

// ── Static keyboards ──

var NAV_ROW = [
  { text: '\u25c0\ufe0f \u041d\u0430\u0437\u0430\u0434', callback_data: 'nav:back' },
  { text: '\uD83C\uDFE0 \u0412 \u043c\u0435\u043d\u044e', callback_data: 'nav:home' }
];

var APP_URL = 'https://podryadpro.ru';

var START_BUTTONS = [
  [{ text: '\uD83D\uDE80 \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u043a\u0430\u0437', url: APP_URL + '/order/new' }],
  [{ text: '\uD83D\uDC77 \u0421\u0442\u0430\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u0435\u043c', url: APP_URL + '/executor/register' }],
  [{ text: '\uD83C\uDFD7 \u041a\u0430\u0442\u0430\u043b\u043e\u0433', url: APP_URL + '/catalog/labor' }],
  [{ text: '\uD83D\uDCCB \u0427\u0430\u0442-\u0437\u0430\u043a\u0430\u0437', callback_data: 'menu:services' }, { text: '\u2754 \u041f\u043e\u043c\u043e\u0449\u044c', callback_data: 'menu:help' }],
];

var REGION_BUTTONS = [[
  { text: '\u041e\u043c\u0441\u043a', callback_data: 'region:omsk' },
  { text: '\u041d\u043e\u0432\u043e\u0441\u0438\u0431\u0438\u0440\u0441\u043a', callback_data: 'region:novosibirsk' }
]];

var CTYPE_BUTTONS = [
  [{ text: '\u0414\u043b\u044f \u0447\u0430\u0441\u0442\u043d\u043e\u0433\u043e \u0434\u043e\u043c\u0430', callback_data: 'ctype:b2c' }],
  [{ text: '\u0414\u043b\u044f \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 / \u0441\u0442\u0440\u043e\u0439\u043a\u0438', callback_data: 'ctype:b2b' }]
];

var SERVICES = [
  ['svc:lawn_mowing',      '\uD83C\uDF31 \u041f\u043e\u043a\u043e\u0441 \u0433\u0430\u0437\u043e\u043d\u0430'],
  ['svc:weed_removal',     '\uD83C\uDF3E \u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u0441\u043e\u0440\u043d\u044f\u043a\u043e\u0432'],
  ['svc:debris_removal',   '\uD83D\uDEAE \u0412\u044b\u0432\u043e\u0437 \u043c\u0443\u0441\u043e\u0440\u0430'],
  ['svc:land_clearing',    '\uD83E\uDE93 \u0420\u0430\u0441\u0447\u0438\u0441\u0442\u043a\u0430 \u0443\u0447\u0430\u0441\u0442\u043a\u0430'],
  ['svc:tree_cutting',     '\uD83E\uDE9A \u0421\u043f\u0438\u043b \u0434\u0435\u0440\u0435\u0432\u044c\u0435\u0432'],
  ['svc:tilling',          '\uD83D\uDE9C \u0412\u0441\u043f\u0430\u0448\u043a\u0430'],
  ['svc:pool_cleaning',    '\uD83C\uDFCA \u0427\u0438\u0441\u0442\u043a\u0430 \u0431\u0430\u0441\u0441\u0435\u0439\u043d\u0430'],
  ['svc:welding',          '\uD83D\uDD25 \u0421\u0432\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b'],
  ['svc:scarification',    '\uD83C\uDF3F \u0421\u043a\u0430\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f'],
  ['svc:aeration',         '\uD83C\uDF2C \u0410\u044d\u0440\u0430\u0446\u0438\u044f'],
  ['svc:pool_assembly',    '\uD83C\uDFD7 \u0421\u0431\u043e\u0440\u043a\u0430 \u0431\u0430\u0441\u0441\u0435\u0439\u043d\u0430'],
  ['svc:pool_maintenance', '\uD83D\uDCA6 \u041e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0431\u0430\u0441\u0441\u0435\u0439\u043d\u0430'],
];

var MATERIALS = [
  ['mat:concrete',  '\u0422\u043e\u0432\u0430\u0440\u043d\u044b\u0439 \u0431\u0435\u0442\u043e\u043d'],
  ['mat:sand',      '\u041a\u0430\u0440\u044c\u0435\u0440\u043d\u044b\u0439 \u043f\u0435\u0441\u043e\u043a'],
  ['mat:gravel',    '\u0413\u0440\u0430\u0432\u0438\u0439'],
  ['mat:crushed',   '\u0429\u0435\u0431\u0435\u043d\u044c'],
  ['mat:cement',    '\u0426\u0435\u043c\u0435\u043d\u0442'],
];

var SUBSCRIPTION_PLANS = [
  ['sub:plan:basic',   '\uD83C\uDF31 \u0411\u0430\u0437\u043e\u0432\u044b\u0439'],
  ['sub:plan:comfort', '\uD83C\uDFE1 \u041a\u043e\u043c\u0444\u043e\u0440\u0442'],
  ['sub:plan:premium', '\uD83C\uDFDB \u041f\u0440\u0435\u043c\u0438\u0443\u043c'],
];

function buildServiceButtons() {
  var rows = [];
  for (var i = 0; i < SERVICES.length; i += 2) {
    var row = [{ text: SERVICES[i][1], callback_data: SERVICES[i][0] }];
    if (SERVICES[i + 1]) row.push({ text: SERVICES[i + 1][1], callback_data: SERVICES[i + 1][0] });
    rows.push(row);
  }
  rows.push([{ text: '\uD83D\uDCC5 \u0410\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442\u043a\u0430', callback_data: 'menu:subscription' }]);
  rows.push(NAV_ROW);
  return rows;
}

function buildMaterialButtons() {
  var rows = [];
  for (var i = 0; i < MATERIALS.length; i += 2) {
    var row = [{ text: MATERIALS[i][1], callback_data: MATERIALS[i][0] }];
    if (MATERIALS[i + 1]) row.push({ text: MATERIALS[i + 1][1], callback_data: MATERIALS[i + 1][0] });
    rows.push(row);
  }
  rows.push([{ text: '\uD83D\uDCC5 \u0410\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442\u043a\u0430', callback_data: 'menu:subscription' }]);
  rows.push(NAV_ROW);
  return rows;
}

function buildSubButtons() {
  return [
    [{ text: '\uD83C\uDF31 \u0411\u0430\u0437\u043e\u0432\u044b\u0439 \u2014 \u043e\u0442 2 490 \u20bd/\u043c\u0435\u0441', callback_data: 'sub:plan:basic' }],
    [{ text: '\uD83C\uDFE1 \u041a\u043e\u043c\u0444\u043e\u0440\u0442 \u2014 \u043e\u0442 4 490 \u20bd/\u043c\u0435\u0441', callback_data: 'sub:plan:comfort' }],
    [{ text: '\uD83C\uDFDB \u041f\u0440\u0435\u043c\u0438\u0443\u043c \u2014 \u043e\u0442 7 490 \u20bd/\u043c\u0435\u0441', callback_data: 'sub:plan:premium' }],
    NAV_ROW
  ];
}

function buildMainMenuB2C() {
  return [
    [{ text: '\uD83D\uDCDD \u041e\u043f\u0438\u0441\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443', callback_data: 'menu:quick_order' }],
    [{ text: '\uD83D\uDEE0 \u0423\u0441\u043b\u0443\u0433\u0438', callback_data: 'menu:services' }, { text: '\uD83E\uDDF1 \u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b', callback_data: 'menu:materials' }],
    [{ text: '\uD83D\uDCCB \u041c\u043e\u0438 \u0437\u0430\u043a\u0430\u0437\u044b', callback_data: 'menu:my_orders' }, { text: '\uD83C\uDF81 \u0414\u0440\u0443\u0437\u044c\u044f\u043c +500 \u20bd', callback_data: 'menu:referral' }],
    [{ text: '\uD83D\uDCC5 \u0410\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442\u043a\u0430', callback_data: 'menu:subscription' }, { text: '\u2754 \u041f\u043e\u043c\u043e\u0449\u044c', callback_data: 'menu:help' }],
    [{ text: '\u260e\ufe0f \u041e\u043f\u0435\u0440\u0430\u0442\u043e\u0440', callback_data: 'menu:operator' }, { text: '\uD83D\uDD04 \u042f \u0431\u0438\u0437\u043d\u0435\u0441', callback_data: 'ctype:b2b' }]
  ];
}

function buildMainMenuB2B() {
  return [
    [{ text: '\uD83D\uDCDD \u041e\u043f\u0438\u0441\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443', callback_data: 'menu:quick_order' }],
    [{ text: '\uD83E\uDDF1 \u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b', callback_data: 'menu:materials' }, { text: '\uD83D\uDEE0 \u0423\u0441\u043b\u0443\u0433\u0438', callback_data: 'menu:services' }],
    [{ text: '\uD83D\uDCCB \u041c\u043e\u0438 \u0437\u0430\u043a\u0430\u0437\u044b', callback_data: 'menu:my_orders' }, { text: '\uD83C\uDF81 \u041f\u0430\u0440\u0442\u043d\u0451\u0440\u0430\u043c', callback_data: 'menu:referral' }],
    [{ text: '\uD83E\uDD1D \u0414\u043e\u0433\u043e\u0432\u043e\u0440 / \u0441\u0447\u0451\u0442', callback_data: 'menu:contract' }, { text: '\u260e\ufe0f \u041c\u0435\u043d\u0435\u0434\u0436\u0435\u0440', callback_data: 'menu:operator' }],
    [{ text: '\uD83D\uDD04 \u042f \u0447\u0430\u0441\u0442\u043d\u0438\u043a', callback_data: 'ctype:b2c' }]
  ];
}

// ── Menu handler (VPS-local, no Vercel) ──

function handleMenu(data, chatId) {

  // Services menu
  if (data === 'menu:services' || data === 'menu:order') {
    sendMessage(chatId, '\uD83D\uDEE0 <b>\u0423\u0441\u043b\u0443\u0433\u0438</b>\n\n\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435, \u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c:', buildServiceButtons());
    return true;
  }

  // Materials
  if (data === 'menu:materials') {
    sendMessage(chatId, '\uD83E\uDDF1 <b>\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b</b>\n\n\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b:', buildMaterialButtons());
    return true;
  }

  // Subscription
  if (data === 'menu:subscription') {
    sendMessage(chatId, '\uD83D\uDCC5 <b>\u0410\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442\u043d\u043e\u0435 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435</b>\n\n\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0430\u043a\u0435\u0442:', buildSubButtons());
    return true;
  }

  // Home
  if (data === 'menu:home' || data === 'nav:home') {
    return false; // forward to Vercel — needs to reset session state in Supabase
  }

  // Quick order — proxy handles prompt locally, text parsing is smart-routed by Vercel
  if (data === 'menu:quick_order') {
    sendMessage(chatId, '\uD83D\uDCDD <b>\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443</b>\n\n\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c, \u043a\u0430\u043a\u043e\u0439 \u043e\u0431\u044a\u0451\u043c \u0438 \u043a\u043e\u0433\u0434\u0430.\n<i>\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u00ab\u041f\u043e\u043a\u043e\u0441\u0438\u0442\u044c \u0433\u0430\u0437\u043e\u043d, 10 \u0441\u043e\u0442\u043e\u043a, \u0437\u0430\u0432\u0442\u0440\u0430\u00bb</i>\n\n\uD83D\uDCF8 \u041c\u043e\u0436\u0435\u0442\u0435 \u043f\u0440\u0438\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0444\u043e\u0442\u043e.', [NAV_ROW]);
    return true;
  }

  // Region picker
  if (data === 'menu:region') {
    sendMessage(chatId, '\uD83D\uDCCD \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0433\u0438\u043e\u043d:', REGION_BUTTONS.concat([NAV_ROW]));
    return true;
  }

  // Help
  if (data === 'menu:help') {
    sendMessage(chatId, '\uD83D\uDD0D <b>\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442</b>\n\n1. \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043b\u0443\u0433\u0443.\n2. \u041e\u0442\u0432\u0435\u0442\u044c\u0442\u0435 \u043d\u0430 3-4 \u043f\u0440\u043e\u0441\u0442\u044b\u0445 \u0432\u043e\u043f\u0440\u043e\u0441\u0430.\n3. \u041c\u0430\u0441\u0442\u0435\u0440 \u0441\u0432\u044f\u0436\u0435\u0442\u0441\u044f \u0441 \u0432\u0430\u043c\u0438 \u0432 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 30 \u043c\u0438\u043d\u0443\u0442.\n\n\uD83D\uDCDE \u041d\u0443\u0436\u043d\u0430 \u043f\u043e\u043c\u043e\u0449\u044c? \u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u0443 \u0447\u0435\u0440\u0435\u0437 \u043c\u0435\u043d\u044e.', [NAV_ROW]);
    return true;
  }

  // Operator
  if (data === 'menu:operator') {
    sendMessage(chatId, '\u260e\ufe0f <b>\u0421\u0432\u044f\u0437\u044c \u0441 \u043e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u043e\u043c</b>\n\n\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0432\u0430\u0448 \u0432\u043e\u043f\u0440\u043e\u0441 \u2014 \u043c\u0435\u043d\u0435\u0434\u0436\u0435\u0440 \u043e\u0442\u0432\u0435\u0442\u0438\u0442 \u0432 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043c\u044f.', [NAV_ROW]);
    return true;
  }

  // Contract (B2B)
  if (data === 'menu:contract') {
    sendMessage(chatId, '\uD83E\uDD1D <b>\u0414\u043e\u0433\u043e\u0432\u043e\u0440 \u0438 \u0441\u0447\u0451\u0442</b>\n\n\u041c\u0435\u043d\u0435\u0434\u0436\u0435\u0440 \u0441\u0432\u044f\u0436\u0435\u0442\u0441\u044f \u0441 \u0432\u0430\u043c\u0438 \u0432 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 \u0447\u0430\u0441\u0430: \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442 \u0434\u043e\u0433\u043e\u0432\u043e\u0440, \u0432\u044b\u0441\u0442\u0430\u0432\u0438\u0442 \u0441\u0447\u0451\u0442, \u0441\u043e\u0433\u043b\u0430\u0441\u0443\u0435\u0442 \u0433\u0440\u0430\u0444\u0438\u043a \u043f\u043e\u0441\u0442\u0430\u0432\u043e\u043a.', [NAV_ROW]);
    return true;
  }

  // My orders / Referral — needs Supabase, forward to Vercel
  if (data === 'menu:my_orders' || data === 'menu:referral') {
    sendMessage(chatId, '\u23f3 \u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...');
    return false; // false = forward to Vercel
  }

  return false; // unknown, forward to Vercel
}

// ── Local commands ──

function handleLocal(update) {
  var text = extractText(update), chatId = extractChatId(update);
  if (!chatId || !text) return false;

  // Callback buttons
  if (isCallback(update)) {
    return handleMenu(text, chatId);
  }

  // Commands
  if (text === '/start') {
    sendMessage(chatId, '\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u042f \u2014 \u0431\u043e\u0442 \u041f\u043e\u0434\u0440\u044f\u0434 PRO. \u041f\u043e\u043c\u043e\u0433\u0430\u044e \u0431\u044b\u0441\u0442\u0440\u043e \u0437\u0430\u043a\u0430\u0437\u0430\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u044b \u043f\u043e \u0434\u043e\u043c\u0443 \u0438 \u0443\u0447\u0430\u0441\u0442\u043a\u0443, \u0441\u0442\u0440\u043e\u0439\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b.\n\n\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435:', START_BUTTONS);
    return true;
  }

  if (text === '/help') {
    sendMessage(chatId, '\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442\n\n1. \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043b\u0443\u0433\u0443.\n2. \u041e\u0442\u0432\u0435\u0442\u044c\u0442\u0435 \u043d\u0430 3-4 \u043f\u0440\u043e\u0441\u0442\u044b\u0445 \u0432\u043e\u043f\u0440\u043e\u0441\u0430.\n3. \u041c\u0430\u0441\u0442\u0435\u0440 \u0441\u0432\u044f\u0436\u0435\u0442\u0441\u044f \u0441 \u0432\u0430\u043c\u0438 \u0432 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 30 \u043c\u0438\u043d\u0443\u0442.\n\n\u041d\u0443\u0436\u043d\u0430 \u043f\u043e\u043c\u043e\u0449\u044c? \u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u0443 \u0447\u0435\u0440\u0435\u0437 \u043c\u0435\u043d\u044e.');
    return true;
  }

  return false;
}

// ── Polling ──

function poll() {
  log('[poll] offset=' + offset);
  tgGet('/getUpdates', { offset: String(offset), timeout: 30 }, function(err, res) {
    if (err) { log('[poll] Error:', err.message); schedule(3000); return; }
    if (!res.ok) { log('[poll] API error:', JSON.stringify(res)); schedule(5000); return; }
    var updates = res.result || [];
    if (updates.length > 0) { log('[poll] Got ' + updates.length + ' updates'); processUpdates(updates, 0); }
    else { schedule(0); }
  });
}

function processUpdates(updates, index) {
  if (!running) return;
  if (index >= updates.length) { schedule(0); return; }
  var update = updates[index], updateId = update.update_id;
  if (updateId >= offset) offset = updateId + 1;
  var cbid = update.callback_query ? update.callback_query.id : '';
  var text = extractText(update).slice(0, 60);
  var kind = isCallback(update) ? 'cb' : (isCommand(update) ? 'cmd' : 'msg');

  if (handleLocal(update)) {
    log('[local] ' + kind + ' "' + text + '"');
    if (cbid) tgPost('/answerCallbackQuery', { callback_query_id: cbid }, function(){});
    processUpdates(updates, index + 1);
    return;
  }

  if (cbid) tgPost('/answerCallbackQuery', { callback_query_id: cbid }, function(){});

  // Show instant loading feedback for callbacks (Supabase Free Tier is slow, Vercel may take 15-20s)
  if (cbid) {
    var loadingText = '\u23f3 \u041e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u044e...\n\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u043f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435.';
    var chatId = extractChatId(update);
    if (chatId) sendMessage(chatId, loadingText);
  }

  postJSON(WEBHOOK_URL, update, { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET }, function(err, status, body) {
    if (err) log('[fwd] ' + kind + ' Error:', err.message);
    else if (status !== 200) log('[fwd] ' + kind + ' HTTP ' + status + ': ' + body.slice(0, 200));
    else log('[fwd] ' + kind + ' OK "' + text + '"');
    processUpdates(updates, index + 1);
  });
}

function schedule(delay) { if (!running) return; setTimeout(poll, delay || 0); }

function log() {
  var args = Array.prototype.slice.call(arguments);
  console.log(new Date().toISOString(), args.join(' '));
}

// ── Start ──

log('Starting Podryad PRO Telegram Poll Proxy');
log('Token:', TOKEN ? TOKEN.slice(0, 8) + '...' : 'NOT SET');
log('Webhook:', WEBHOOK_URL);
log('Secret:', WEBHOOK_SECRET ? 'configured' : 'NOT SET');

if (!TOKEN) { log('ERROR: TELEGRAM_BOT_TOKEN is not set'); process.exit(1); }

tgGet('/getMe', {}, function(err, bot) {
  if (err) { log('Failed to get bot info:', err.message); process.exit(1); }
  if (!bot.ok) { log('Failed to get bot info:', JSON.stringify(bot)); process.exit(1); }
  log('Bot:', bot.result.first_name, '@' + bot.result.username, 'ID:', bot.result.id);

  tgPost('/deleteWebhook', { drop_pending_updates: false }, function(err, res) {
    if (err) log('[webhook] Delete error:', err.message);
    else if (res.ok) log('[webhook] Deleted.');
    else log('[webhook] Delete response:', JSON.stringify(res));

    var commands = { commands: [
      { command: 'start', description: '\u041d\u0430\u0447\u0430\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443' },
      { command: 'help', description: '\u041f\u043e\u043c\u043e\u0449\u044c' }
    ]};
    tgPost('/setMyCommands', commands, function(cErr) {
      if (cErr) log('[commands] Error:', cErr.message);
      else log('[commands] Set');
    });
    poll();
  });
});

process.on('SIGINT', function() { log('Stopping...'); running = false; });
process.on('SIGTERM', function() { log('Stopping...'); running = false; });
