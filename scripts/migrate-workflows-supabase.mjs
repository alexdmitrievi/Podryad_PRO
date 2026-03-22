/**
 * Миграция workflows 04, 05, 06, 07, 09 с Google Sheets на Supabase HTTP.
 * Также правит 01 (sendMessage URL на TELEGRAM_BOT_TOKEN).
 * Запуск: node scripts/migrate-workflows-supabase.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const wf = (n) => path.join(root, 'workflows', n);

const supHeaders = [
  { name: 'apikey', value: '={{ $env.SUPABASE_SERVICE_ROLE_KEY }}' },
  { name: 'Authorization', value: '=Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}' },
  { name: 'Accept-Profile', value: 'public' },
];

function sbUrl(pathSuffix) {
  return `={{ $env.SUPABASE_URL.replace(/\\/$/, '') + '${pathSuffix}' }}`;
}

// ── 04 Rating ──
function migrate04() {
  const p = wf('04-rating-system.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nodes = [];

  for (const n of data.nodes) {
    if (n.name === 'Lookup Order' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/orders?select=*&order_id=eq.' + encodeURIComponent(String($('Extract Done Data').first().json.order_id))"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'Lookup Order',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows[0]?.order_id) throw new Error('ORDER_NOT_FOUND');\nreturn [{ json: rows[0] }];",
        },
        id: 'norm-order-done-04',
        name: 'Normalize Order Row',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 120, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Find Voter Orders' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/orders?select=*&customer_id=eq.' + encodeURIComponent($('Parse Poll Answer').first().json.voter_id) + '&status=eq.closed&order=created_at.desc&limit=1"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'Fetch Last Closed Order',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows[0]?.order_id) throw new Error('NO_CLOSED_ORDERS');\nreturn [{ json: rows[0] }];",
        },
        id: 'norm-closed-04',
        name: 'Normalize Last Closed Order',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 120, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Lookup Worker' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/workers?select=*&telegram_id=eq.' + encodeURIComponent(String($('Find Executor').first().json.executor_id))"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'Lookup Worker',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows[0]?.telegram_id) throw new Error('WORKER_NOT_FOUND');\nreturn [{ json: rows[0] }];",
        },
        id: 'norm-worker-04',
        name: 'Normalize Worker Row',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 120, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Update Worker Rating' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'PATCH',
          url: sbUrl(
            "/rest/v1/workers?telegram_id=eq.' + encodeURIComponent(String($('Calculate Rating').first().json.telegram_id))"
          ),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=minimal' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ rating: $('Calculate Rating').first().json.rating, jobs_count: $('Calculate Rating').first().json.jobs_count, ban_until: $('Calculate Rating').first().json.ban_until || null }) }}",
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Update Worker Rating',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Determine Role' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        "const order = $('Lookup Order').first().json;",
        "const order = $('Normalize Order Row').first().json;"
      );
    }
    if (n.name === 'Find Executor' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = `const order = $('Normalize Last Closed Order').first().json;\nconst score = $('Parse Poll Answer').first().json.score;\nif (!order.executor_id) {\n  throw new Error('NO_EXECUTOR');\n}\nreturn [{\n  json: {\n    executor_id: order.executor_id,\n    order_id: order.order_id,\n    score\n  }\n}];`;
    }
    if (n.name === 'Calculate Rating' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        "const worker = $('Lookup Worker').first().json;",
        "const worker = $('Normalize Worker Row').first().json;"
      );
    }
    if (n.name === 'Send Poll' && n.type === 'n8n-nodes-base.httpRequest') {
      n.parameters.url =
        "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendPoll' }}";
      n.parameters.jsonBody =
        '={{ JSON.stringify({ chat_id: Number($json.customer_id), question: "❓ Как прошёл заказ #" + String($json.order_id) + "? Оцените исполнителя:", options: ["⭐ Плохо (1)", "⭐⭐ Ниже среднего (2)", "⭐⭐⭐ Нормально (3)", "⭐⭐⭐⭐ Хорошо (4)", "⭐⭐⭐⭐⭐ Отлично (5)"], is_anonymous: false, allows_multiple_answers: false }) }}';
    }
    if (n.name === 'Notify Admin Error' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
    }
    nodes.push(n);
  }

  data.nodes = nodes;
  const c = data.connections;
  c['Lookup Order'] = { main: [[{ node: 'Normalize Order Row', type: 'main', index: 0 }]] };
  c['Normalize Order Row'] = { main: [[{ node: 'Determine Role', type: 'main', index: 0 }]] };
  c['Extract Done Data'] = { main: [[{ node: 'Lookup Order', type: 'main', index: 0 }]] };

  c['Fetch Last Closed Order'] = {
    main: [[{ node: 'Normalize Last Closed Order', type: 'main', index: 0 }]],
  };
  c['Normalize Last Closed Order'] = { main: [[{ node: 'Find Executor', type: 'main', index: 0 }]] };
  c['Parse Poll Answer'] = { main: [[{ node: 'Fetch Last Closed Order', type: 'main', index: 0 }]] };

  c['Lookup Worker'] = { main: [[{ node: 'Normalize Worker Row', type: 'main', index: 0 }]] };
  c['Normalize Worker Row'] = { main: [[{ node: 'Calculate Rating', type: 'main', index: 0 }]] };

  delete c['Find Voter Orders'];

  data.versionId = 'podryad-04-rating-v3-supabase';
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK', p);
}

// ── 06 Analytics ──
function migrate06() {
  const p = wf('06-daily-analytics.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nodes = [];
  for (const n of data.nodes) {
    if (n.name === 'Read All Orders' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl('/rest/v1/orders?select=*'),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 60000 },
        },
        id: n.id,
        name: 'Fetch Orders Supabase',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Read All Workers' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl('/rest/v1/workers?select=*'),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 60000 },
        },
        id: n.id,
        name: 'Fetch Workers Supabase',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Calculate Metrics' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode
        .replace(/\$\('Read All Orders'\)/g, "$('Fetch Orders Supabase')")
        .replace(/\$\('Read All Workers'\)/g, "$('Fetch Workers Supabase')")
        .replace(
          "const allOrders = $('Fetch Orders Supabase').all().map(i => i.json);",
          "const ordersRaw = $('Fetch Orders Supabase').first().json;\nconst allOrders = Array.isArray(ordersRaw) ? ordersRaw : [ordersRaw].filter(Boolean);"
        )
        .replace(
          "const allWorkers = $('Fetch Workers Supabase').all().map(i => i.json);",
          "const workersRaw = $('Fetch Workers Supabase').first().json;\nconst allWorkers = Array.isArray(workersRaw) ? workersRaw : [workersRaw].filter(Boolean);"
        );
    }
    if (n.name === 'Send Daily Report' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
    }
    if (n.name === 'Notify Admin Error' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
    }
    nodes.push(n);
  }
  data.nodes = nodes;
  const c = data.connections;
  c['Daily Cron 20:00'] = {
    main: [[{ node: 'Fetch Orders Supabase', type: 'main', index: 0 }]],
  };
  c['Fetch Orders Supabase'] = {
    main: [[{ node: 'Fetch Workers Supabase', type: 'main', index: 0 }]],
  };
  c['Fetch Workers Supabase'] = {
    main: [[{ node: 'Calculate Metrics', type: 'main', index: 0 }]],
  };
  delete c['Read All Orders'];
  delete c['Read All Workers'];
  data.versionId = 'podryad-06-analytics-v3-supabase';
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK', p);
}

// ── 07 MAX ──
function migrate07() {
  const p = wf('07-max-crosspost.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nodes = [];
  for (const n of data.nodes) {
    if (n.name === 'Read Published Orders' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl("/rest/v1/orders?select=*&status=eq.published"),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 30000 },
        },
        id: n.id,
        name: 'Read Published Orders',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Filter Unposted' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = `const raw = $('Read Published Orders').first().json;\nconst items = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((row) => ({ json: row }));\nconst unpublished = items.filter((item) => {\n  const m = item.json.max_posted;\n  return m !== true && m !== 'TRUE' && m !== 'true';\n});\nif (unpublished.length === 0) return [];\nreturn unpublished;`;
    }
    if (n.name === 'Update Order MAX Status' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'PATCH',
          url: sbUrl(
            "/rest/v1/orders?order_id=eq.' + encodeURIComponent(String($('Build MAX Post').first().json.order_id))"
          ),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=minimal' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ max_posted: true, max_message_id: String($json.body?.message?.body?.mid || $json.message?.body?.mid || $json.body?.mid || '') }) }}",
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Update Order MAX Status',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Notify Admin Error' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
    }
    nodes.push(n);
  }
  data.nodes = nodes;
  data.versionId = 'podryad-07-max-v2-supabase';
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK', p);
}

// ── 05 Monetization ──
function migrate05() {
  const p = wf('05-monetization.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nodes = [];
  for (const n of data.nodes) {
    if (n.name === 'Sheets: Check VIP Status' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/workers?select=*&telegram_id=eq.' + encodeURIComponent(String($('Telegram Trigger').first().json.message.from.id))"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'HTTP Get Worker VIP',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nreturn rows.filter((r) => r && r.telegram_id).map((r) => ({ json: r }));",
        },
        id: 'norm-vip-worker-05',
        name: 'Normalize VIP Worker',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 140, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Check VIP Status' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        "const workers = $('Sheets: Check VIP Status').all();",
        "const workers = $('Normalize VIP Worker').all();"
      );
    }
    if (n.name === 'Sheets: Activate VIP' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'PATCH',
          url: sbUrl(
            "/rest/v1/workers?telegram_id=eq.' + encodeURIComponent(String($('Calculate VIP Expiry').first().json.telegram_id))"
          ),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=minimal' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ is_vip: 'TRUE', vip_expires_at: $('Calculate VIP Expiry').first().json.vip_expires_at }) }}",
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Supabase Activate VIP',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Sheets: Log VIP Payment' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'POST',
          url: sbUrl('/rest/v1/payments'),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=minimal' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ yukassa_id: $('Parse VIP Payment').first().json.yukassa_id, order_id: null, payer_id: String($('Parse VIP Payment').first().json.user_id), amount: $('Parse VIP Payment').first().json.amount, type: 'vip', status: 'paid', paid_at: new Date().toISOString(), created_at: new Date().toISOString() }) }}",
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Supabase Log VIP Payment',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Sheets: Read All Workers' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl('/rest/v1/workers?select=*'),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 30000 },
        },
        id: n.id,
        name: 'Fetch All Workers Supabase',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nreturn rows.filter(Boolean).map((r) => ({ json: r }));",
        },
        id: 'norm-all-workers-05',
        name: 'Normalize All Workers',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 140, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Filter Top Workers' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        "const allWorkers = $('Sheets: Read All Workers').all().map(i => i.json);",
        "const allWorkers = $('Normalize All Workers').all().map(i => i.json);"
      );
    }
    if (n.name === 'Send VIP Offer' && n.type === 'n8n-nodes-base.httpRequest') {
      n.parameters.url =
        "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendMessage' }}";
    }
    if (n.name === 'Send Pick Result' && n.type === 'n8n-nodes-base.httpRequest') {
      n.parameters.url =
        "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendMessage' }}";
    }
    nodes.push(n);
  }
  data.nodes = nodes;
  const c = data.connections;
  c['HTTP Get Worker VIP'] = { main: [[{ node: 'Normalize VIP Worker', type: 'main', index: 0 }]] };
  c['Normalize VIP Worker'] = { main: [[{ node: 'Check VIP Status', type: 'main', index: 0 }]] };
  c['Switch Command'].main[0][0].node = 'HTTP Get Worker VIP';

  c['Calculate VIP Expiry'] = { main: [[{ node: 'Supabase Activate VIP', type: 'main', index: 0 }]] };
  c['Supabase Activate VIP'] = {
    main: [
      [
        { node: 'Supabase Log VIP Payment', type: 'main', index: 0 },
        { node: 'VIP Webhook Response', type: 'main', index: 0 },
      ],
    ],
  };
  c['Supabase Log VIP Payment'] = { main: [[{ node: 'Send: VIP Activated', type: 'main', index: 0 }]] };

  c['Fetch All Workers Supabase'] = {
    main: [[{ node: 'Normalize All Workers', type: 'main', index: 0 }]],
  };
  c['Normalize All Workers'] = { main: [[{ node: 'Filter Top Workers', type: 'main', index: 0 }]] };
  c['Parse /pick Request'] = { main: [[{ node: 'Fetch All Workers Supabase', type: 'main', index: 0 }]] };

  delete c['Sheets: Check VIP Status'];
  delete c['Sheets: Activate VIP'];
  delete c['Sheets: Log VIP Payment'];
  delete c['Sheets: Read All Workers'];

  data.versionId = 'podryad-05-monetization-v3-supabase';
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK', p);
}

// ── 09 Equipment ──
function migrate09() {
  const p = wf('09-equipment-rental.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nodes = [];
  for (const n of data.nodes) {
    if (n.name === 'Read All Equipment' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl('/rest/v1/equipment?select=*'),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 30000 },
        },
        id: n.id,
        name: 'Read All Equipment',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Build Catalog Message' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = `const raw = $('Read All Equipment').first().json;\nconst items = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);\nconst available = items.filter(i => i.status === 'available');\n\nconst categories = {\n  'garden': '🌿 Сад и участок',\n  'construction': '🔨 Стройка и ремонт',\n  'special': '⚡ Спецтехника'\n};\n\nlet text = '🔧 *Аренда техники | Подряд PRO*\\\\n\\\\n';\n\nconst grouped = {};\nfor (const item of available) {\n  const cat = item.category || 'other';\n  if (!grouped[cat]) grouped[cat] = [];\n  grouped[cat].push(item);\n}\n\nfor (const [cat, catItems] of Object.entries(grouped)) {\n  const catName = categories[cat] || '📋 Другое';\n  text += \`*\${catName}*\\\\n\`;\n  for (const item of catItems) {\n    text += \`• \${item.name} — от \${item.rate_4h}₽/4ч\\\\n\`;\n    text += \`  /rent \${item.equipment_id}\\\\n\`;\n  }\n  text += '\\\\n';\n}\n\ntext += '💡 Нажмите на команду /rent ID чтобы забронировать\\\\n';\ntext += '🎁 Скидка 15% при заказе вместе с исполнителями\\\\n\\\\n';\ntext += '🌐 Каталог на сайте: podryad.pro/equipment';\n\nconst chatId = $('Parse Command').first().json.chat_id;\n\nreturn [{ json: { chat_id: chatId, text } }];`;
    }
    if (n.name === 'Lookup Equipment' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/equipment?select=*&equipment_id=eq.' + encodeURIComponent($('Parse Command').item.json.equipment_id)"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'Lookup Equipment',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows[0]?.equipment_id) throw new Error('EQUIPMENT_NOT_FOUND');\nreturn [{ json: rows[0] }];",
        },
        id: 'norm-eq-09a',
        name: 'Normalize Equipment Row',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 120, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Build Detail Message' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        "const equip = $('Lookup Equipment').first().json;",
        "const equip = $('Normalize Equipment Row').first().json;"
      );
    }
    if (n.name === 'Lookup For Booking' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/equipment?select=*&equipment_id=eq.' + encodeURIComponent($json.equipment_id)"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'Lookup For Booking',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows[0]?.equipment_id) throw new Error('EQUIPMENT_NOT_FOUND');\nreturn [{ json: rows[0] }];",
        },
        id: 'norm-eq-book-09',
        name: 'Normalize Equipment Booking',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 120, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Calculate Rental Price' && n.type === 'n8n-nodes-base.code') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        "const equip = $('Lookup For Booking').first().json;",
        "const equip = $('Normalize Equipment Booking').first().json;"
      );
    }
    if (n.name === 'Save Rental' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'POST',
          url: sbUrl('/rest/v1/rentals'),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=representation' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ rental_id: $json.rental_id, equipment_id: $json.equipment_id, equipment_name: $json.equipment_name, renter_id: $json.user_id, renter_name: $json.first_name, duration: $json.duration_label, duration_hours: $json.duration_hours, price: $json.price, deposit: $json.deposit, status: 'pending', created_at: $json.created_at, paid_at: null, returned_at: null, yukassa_id: null }) }}",
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Save Rental',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Lookup Rental' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'GET',
          url: sbUrl(
            "/rest/v1/rentals?select=*&rental_id=eq.' + encodeURIComponent($json.rental_id)"
          ),
          sendHeaders: true,
          headerParameters: { parameters: supHeaders },
          options: { timeout: 15000 },
        },
        id: n.id,
        name: 'Lookup Rental',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      nodes.push({
        parameters: {
          jsCode:
            "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows[0]?.rental_id) throw new Error('RENTAL_NOT_FOUND');\nreturn [{ json: rows[0] }];",
        },
        id: 'norm-rental-09',
        name: 'Normalize Rental Row',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [n.position[0] + 120, n.position[1]],
      });
      continue;
    }
    if (n.name === 'Update Rental Paid' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'PATCH',
          url: sbUrl(
            "/rest/v1/rentals?rental_id=eq.' + encodeURIComponent($('Parse Payment Callback').first().json.rental_id)"
          ),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=minimal' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), yukassa_id: $('Parse Payment Callback').first().json.yukassa_id }) }}",
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Update Rental Paid',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Mark Equipment Rented' && n.type === 'n8n-nodes-base.googleSheets') {
      nodes.push({
        parameters: {
          method: 'PATCH',
          url: sbUrl(
            "/rest/v1/equipment?equipment_id=eq.' + encodeURIComponent($('Normalize Rental Row').first().json.equipment_id)"
          ),
          sendHeaders: true,
          headerParameters: {
            parameters: [
              ...supHeaders,
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Prefer', value: 'return=minimal' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={{ JSON.stringify({ status: "rented" }) }}',
          options: { timeout: 20000 },
        },
        id: n.id,
        name: 'Mark Equipment Rented',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: n.position,
      });
      continue;
    }
    if (n.name === 'Send Detail' && n.type === 'n8n-nodes-base.httpRequest') {
      n.parameters.url =
        "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendMessage' }}";
      n.parameters.credentials = undefined;
    }
    if (n.name === 'Send Payment Link' && n.type === 'n8n-nodes-base.httpRequest') {
      n.parameters.url =
        "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendMessage' }}";
      n.parameters.credentials = undefined;
    }
    if (n.name === 'Notify Admin New Rental' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
    }
    if (n.name === 'Confirm to Renter' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = "={{ $('Normalize Rental Row').item.json.renter_id }}";
      n.parameters.text =
        '✅ *Техника забронирована!*\n\n🔧 {{ $(\'Normalize Rental Row\').item.json.equipment_name }}\n⏱ {{ $(\'Normalize Rental Row\').item.json.duration }}\n🆔 Бронь: {{ $(\'Normalize Rental Row\').item.json.rental_id }}\n\n📍 *Как получить:*\nСамовывоз: бокс «Кладовка55», Омск\nДоставка: 500₽ (напишите адрес в ответ)\n\n🔒 При получении — залог {{ $(\'Normalize Rental Row\').item.json.deposit }}₽\n(возвращается при сдаче в исправном состоянии)\n\n📞 Для согласования времени выдачи свяжитесь с нами в боте.';
    }
    if (n.name === 'Confirm to Admin' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
      n.parameters.text =
        '✅ *Оплата аренды получена!*\n\n🔧 {{ $(\'Normalize Rental Row\').item.json.equipment_name }}\n⏱ {{ $(\'Normalize Rental Row\').item.json.duration }}\n💰 {{ $(\'Normalize Rental Row\').item.json.price }}₽\n👤 {{ $(\'Normalize Rental Row\').item.json.renter_name }} (ID: {{ $(\'Normalize Rental Row\').item.json.renter_id }})\n🆔 {{ $(\'Normalize Rental Row\').item.json.rental_id }}\n\n📦 Подготовьте технику к выдаче!';
    }
    if (n.name === 'Notify Admin Error' && n.type === 'n8n-nodes-base.telegram') {
      n.parameters.chatId = '={{ $env.TELEGRAM_ADMIN_ID }}';
    }
    nodes.push(n);
  }
  data.nodes = nodes;
  const c = data.connections;
  c['Lookup Equipment'] = { main: [[{ node: 'Normalize Equipment Row', type: 'main', index: 0 }]] };
  c['Normalize Equipment Row'] = { main: [[{ node: 'Is Available?', type: 'main', index: 0 }]] };
  c['Lookup For Booking'] = { main: [[{ node: 'Normalize Equipment Booking', type: 'main', index: 0 }]] };
  c['Normalize Equipment Booking'] = { main: [[{ node: 'Calculate Rental Price', type: 'main', index: 0 }]] };
  c['Lookup Rental'] = { main: [[{ node: 'Normalize Rental Row', type: 'main', index: 0 }]] };
  c['Normalize Rental Row'] = { main: [[{ node: 'Update Rental Paid', type: 'main', index: 0 }]] };
  data.versionId = 'podryad-09-rental-v2-supabase';
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK', p);
}

function fix01Telegram() {
  const p = wf('01-order-intake.json');
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(
    /=https:\/\/api\.telegram\.org\/bot[0-9]+:[A-Za-z0-9_-]+\/sendMessage/g,
    "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendMessage' }}"
  );
  fs.writeFileSync(p, s, 'utf8');
  console.log('OK fix01', p);
}

migrate04();
migrate06();
migrate07();
migrate05();
migrate09();
fix01Telegram();
