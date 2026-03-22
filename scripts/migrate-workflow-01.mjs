/**
 * Миграция workflows/01-order-intake.json: Google Sheets → Supabase HTTP.
 * Запуск: node scripts/migrate-workflow-01.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const wfPath = path.join(root, 'workflows', '01-order-intake.json');
const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const fetchRates = {
  parameters: {
    method: 'GET',
    url: "={{ $env.SUPABASE_URL.replace(/\\/$/, '') + '/rest/v1/rates?select=*&is_active=eq.true&work_type=eq.' + encodeURIComponent($('Parse OpenAI JSON').first().json.work_type) + '&limit=1' }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'apikey', value: '={{ $env.SUPABASE_SERVICE_ROLE_KEY }}' },
        { name: 'Authorization', value: '=Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}' },
        { name: 'Accept-Profile', value: 'public' },
      ],
    },
    options: { timeout: 15000 },
  },
  id: 'a1-fetch-rates-sb',
  name: 'Fetch Rates Supabase',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1650, 1100],
};

const normRates = {
  parameters: {
    jsCode:
      "const raw = $input.first().json;\nconst rows = Array.isArray(raw) ? raw : [raw];\nif (!rows.length) throw new Error('RATE_NOT_FOUND');\nreturn [{ json: rows[0] }];",
  },
  id: 'a1-norm-rates-sb',
  name: 'Normalize Rates Row',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [1760, 1100],
};

const insertOrder = {
  parameters: {
    method: 'POST',
    url: "={{ $env.SUPABASE_URL.replace(/\\/$/, '') + '/rest/v1/orders' }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'apikey', value: '={{ $env.SUPABASE_SERVICE_ROLE_KEY }}' },
        { name: 'Authorization', value: '=Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}' },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' },
        { name: 'Accept-Profile', value: 'public' },
      ],
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody:
      "={{ JSON.stringify({ order_id: $json.order_id, customer_id: $json.customer_id, address: $json.address, lat: $json.lat, lon: $json.lon, yandex_link: $json.yandex_link, time: $json.time, payment_text: $json.payment_text, people: $json.people, hours: $json.hours, work_type: $json.work_type, comment: $json.comment || null, status: $json.status, executor_id: $json.executor_id || null, message_id: $json.message_id || null, created_at: $json.created_at, client_rate: $json.client_rate, worker_rate: $json.worker_rate, client_total: $json.client_total, worker_payout: $json.worker_payout, margin: $json.margin, payout_status: $json.payout_status }) }}",
    options: { timeout: 20000 },
  },
  id: 'a1-insert-order-sb',
  name: 'Insert Order Supabase',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [2110, 1100],
};

const normInserted = {
  parameters: {
    jsCode:
      "const raw = $input.first().json;\nconst row = Array.isArray(raw) ? raw[0] : raw;\nif (!row || !row.order_id) throw new Error('INSERT_FAILED');\nreturn [{ json: row }];",
  },
  id: 'a1-norm-insert-sb',
  name: 'Normalize Inserted Order',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [2230, 1100],
};

const newNodes = [];

for (const n of data.nodes) {
  if (n.name === 'Read Rates') {
    newNodes.push(fetchRates, normRates);
    continue;
  }
  if (n.name === 'Append Order') {
    newNodes.push(insertOrder, normInserted);
    continue;
  }
  if (n.name === 'Read Saved Order') {
    continue;
  }
  if (n.name === 'Build Order Object' && n.type === 'n8n-nodes-base.code') {
    n.parameters.jsCode = `const parsed = $('Parse OpenAI JSON').first().json;\nconst geoResult = $('Nominatim Geocode').first().json;\nconst ratesResult = $('Normalize Rates Row').first().json;\n\nconst geo = Array.isArray(geoResult) ? geoResult[0] : geoResult;\nconst lat = geo?.lat ? parseFloat(geo.lat) : 54.9894;\nconst lon = geo?.lon ? parseFloat(geo.lon) : 73.3667;\nconst addr = parsed.address || 'Омск';\nconst yandexLink = \`https://yandex.ru/maps/?pt=\${lon},\${lat}&z=16&text=\${encodeURIComponent(addr)}\`;\n\nconst people = Number(parsed.people || 1);\nconst hours = Number(parsed.hours || 0);\nconst clientRate = parseInt(ratesResult.client_rate, 10) || 600;\nconst workerRate = parseInt(ratesResult.worker_rate, 10) || 400;\nconst minHours = parseInt(ratesResult.min_hours, 10) || 1;\nconst effectiveHours = Math.max(hours, minHours);\nconst clientTotal = clientRate * people * effectiveHours;\nconst workerPayout = workerRate * people * effectiveHours;\nconst margin = clientTotal - workerPayout;\nconst customerId = String($('Telegram Trigger').first().json.message.from.id);\nconst createdAt = new Date().toISOString();\nconst orderId = \`n8n-\${Date.now()}-\${Math.random().toString(36).slice(2, 9)}\`;\n\nreturn [{\n  json: {\n    order_id: orderId,\n    customer_id: customerId,\n    address: addr,\n    lat,\n    lon,\n    yandex_link: yandexLink,\n    time: parsed.time || '',\n    payment_text: \`\${clientRate}₽/час × \${people} чел × \${effectiveHours} ч\`,\n    people,\n    hours: effectiveHours,\n    work_type: parsed.work_type || 'другое',\n    comment: parsed.comment || '',\n    status: 'pending',\n    executor_id: '',\n    message_id: '',\n    created_at: createdAt,\n    client_rate: clientRate,\n    worker_rate: workerRate,\n    client_total: clientTotal,\n    worker_payout: workerPayout,\n    margin,\n    payout_status: 'pending'\n  }\n}];`;
  }
  if (n.name === 'Build Customer Message' && n.type === 'n8n-nodes-base.code') {
    n.parameters.jsCode = `const order = $('Normalize Inserted Order').first().json;\nconst orderId = order.order_id || 'new';\n\nconst text =\n\`✅ *Заказ принят!*\\n\\n\` +\n\`📍 \${order.address}\\n\` +\n\`🗺 [Открыть на карте](\${order.yandex_link})\\n\` +\n\`⏰ \${order.time || 'не указано'}\\n\` +\n\`👥 \${order.people} чел. × \${order.hours} ч.\\n\` +\n\`📋 \${order.work_type}\\n\\n\` +\n\`━━━━━━━━━━━━━━━━━━\\n\` +\n\`💰 *Стоимость: \${order.client_total}₽*\\n\` +\n\`  (\${order.client_rate}₽/час × \${order.people} чел × \${order.hours} ч)\\n\` +\n\`━━━━━━━━━━━━━━━━━━\\n\\n\` +\n\`💳 Оплатите для публикации заказа:\`;\n\nreturn [{\n  json: {\n    order_id: String(orderId),\n    client_total: Number(order.client_total),\n    text\n  }\n}];`;
  }
  newNodes.push(n);
}

data.nodes = newNodes;

const conn = data.connections;

// Nominatim → Fetch Rates → Normalize → Build Order Object
conn['Nominatim Geocode'] = {
  main: [[{ node: 'Fetch Rates Supabase', type: 'main', index: 0 }]],
};
conn['Fetch Rates Supabase'] = {
  main: [[{ node: 'Normalize Rates Row', type: 'main', index: 0 }]],
};
conn['Normalize Rates Row'] = {
  main: [[{ node: 'Build Order Object', type: 'main', index: 0 }]],
};
conn['Build Order Object'] = {
  main: [[{ node: 'Insert Order Supabase', type: 'main', index: 0 }]],
};
conn['Insert Order Supabase'] = {
  main: [[{ node: 'Normalize Inserted Order', type: 'main', index: 0 }]],
};
conn['Normalize Inserted Order'] = {
  main: [[{ node: 'Build Customer Message', type: 'main', index: 0 }]],
};

delete conn['Read Rates'];
delete conn['Append Order'];
delete conn['Read Saved Order'];

data.versionId = 'podryad-01-intake-v3-supabase';
fs.writeFileSync(wfPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Updated', wfPath);
