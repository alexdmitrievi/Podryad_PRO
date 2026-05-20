// Podryad PRO — MAX Long Poll Proxy (VPS → Vercel webhook)
// Polls MAX /updates, forwards each event to Vercel webhook for funnel processing
// Node 12+ compatible, zero external dependencies

var https = require('https');
var url = require('url');

var TOKEN = process.env.MAX_BOT_TOKEN || 'f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN';
var WEBHOOK_URL = process.env.MAX_WEBHOOK_URL || 'https://www.podryadpro.ru/api/max/webhook';
var WEBHOOK_SECRET = process.env.MAX_WEBHOOK_SECRET || 'c5d8f23a1da89ca4b25c5a83171e3538858e3cc51b2ceb9d235cd669d49ce30c';
var API_BASE = 'https://platform-api.max.ru';

var marker = 0;
var running = true;

// ====== HTTP helpers ======

function maxGet(path, query, cb) {
  var qs = query ? '?' + Object.keys(query).map(function(k) { return k + '=' + encodeURIComponent(query[k]); }).join('&') : '';
  var u = API_BASE + path + qs;
  https.get(u, { headers: { Authorization: TOKEN } }, function(res) {
    var body = ''; res.on('data', function(c) { body += c; }); res.on('end', function() { try { cb(null, JSON.parse(body)); } catch(e) { cb(e); } });
  }).on('error', cb);
}

function postJSON(targetUrl, body, headers, cb) {
  var parsed = url.parse(targetUrl);
  var data = JSON.stringify(body);
  var allHeaders = Object.assign({}, headers || {}, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) });
  var opts = { hostname: parsed.hostname, port: parsed.port || 443, path: parsed.path, method: 'POST', headers: allHeaders };
  var req = https.request(opts, function(res) {
    var b = ''; res.on('data', function(c) { b += c; }); res.on('end', function() { cb(null, res.statusCode, b); });
  });
  req.on('error', cb);
  req.write(data); req.end();
}

// ====== Polling ======

function poll() {
  log('[poll] marker=' + marker);
  maxGet('/updates', { marker: String(marker) }, function(err, res) {
    if (err) { log('[poll] Error:', err.message); schedule(); return; }

    var updates = res.updates || [];
    if (updates.length > 0) {
      log('[poll] Got ' + updates.length + ' updates, forwarding...');
      var done = 0;
      updates.forEach(function(update) {
        postJSON(WEBHOOK_URL, update, { 'x-max-bot-api-secret-token': WEBHOOK_SECRET }, function(err, status, body) {
          if (err) { log('[fwd] Error:', err.message); }
          else if (status !== 200) { log('[fwd] HTTP ' + status + ': ' + body.slice(0,100)); }
          else { log('[fwd] OK ' + (update.update_type || '?')); }
          done++;
          if (done >= updates.length) schedule();
        });
      });
    } else {
      schedule();
    }

    if (res.marker) marker = res.marker;
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

log('Starting Podryad PRO MAX Poll Proxy');
log('Token:', TOKEN.slice(0,8) + '...');
log('Webhook:', WEBHOOK_URL);

maxGet('/me', {}, function(err, bot) {
  if (err) { log('Failed to get bot info:', err.message); process.exit(1); }
  log('Bot:', bot.first_name, '@' + bot.username, 'ID:', bot.user_id);

  // Set command hints
  var commandsBody = JSON.stringify({
    commands: [
      { name: 'старт', description: '🚀 Начать работу' },
      { name: 'помощь', description: '❓ Помощь' },
      { name: 'заказ', description: '📋 Создать заказ' },
      { name: 'статус', description: '📊 Статус заказов' },
      { name: 'заказы', description: '📦 Все заказы' },
    ]
  });
  var parsed = url.parse(API_BASE + '/me');
  var opts = { hostname: parsed.hostname, port: 443, path: parsed.path, method: 'PATCH',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(commandsBody) } };
  var req = https.request(opts, function(res) {
    var b = ''; res.on('data', function(c) { b += c; }); res.on('end', function() { log('[commands] Done'); });
  });
  req.on('error', function() {});
  req.write(commandsBody); req.end();

  poll();
});

process.on('SIGINT', function() { log('Stopping...'); running = false; });
process.on('SIGTERM', function() { log('Stopping...'); running = false; });
