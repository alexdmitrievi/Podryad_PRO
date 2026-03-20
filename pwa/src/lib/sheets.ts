import { JWT } from 'google-auth-library';
import { Order, Worker } from './types';

// Workers sheet: A(telegram_id) .. P(accepted_offer)
const WORKER_COLUMNS: Record<string, number> = {
  telegram_id: 0,
  username: 1,
  name: 2,
  phone: 3,
  rating: 4,
  jobs_count: 5,
  white_list: 6,
  is_vip: 7,
  vip_expires_at: 8,
  skills: 9,
  balance: 10,
  ban_until: 11,
  created_at: 12,
  is_selfemployed: 13,
  card_last4: 14,
  accepted_offer: 15,
};

// v3.1 Orders schema: A(order_id) .. Y(max_message_id)
const SHEET_COLUMNS: Record<string, number> = {
  order_id: 0,
  customer_id: 1,
  address: 2,
  lat: 3,
  lon: 4,
  yandex_link: 5,
  time: 6,
  payment_text: 7,
  people: 8,
  hours: 9,
  work_type: 10,
  comment: 11,
  status: 12,
  executor_id: 13,
  message_id: 14,
  created_at: 15,
  client_rate: 16,
  worker_rate: 17,
  client_total: 18,
  worker_payout: 19,
  margin: 20,
  payout_status: 21,
  payout_at: 22,
  max_posted: 23,
  max_message_id: 24,
};

const SPREADSHEET_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getSheetsJwtClient(): JWT | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new JWT({
    email,
    key,
    scopes: SPREADSHEET_SCOPES,
  });
}

async function getSheetsWriteHeaders(): Promise<Record<string, string>> {
  const client = getSheetsJwtClient();
  if (!client) {
    throw new Error('GOOGLE_CREDENTIALS_MISSING');
  }
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error('GOOGLE_TOKEN_FAILED');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function orderFromRow(row: string[]): Order {
  return {
    order_id: parseInt(row[SHEET_COLUMNS.order_id]) || 0,
    customer_id: row[SHEET_COLUMNS.customer_id] || '',
    address: row[SHEET_COLUMNS.address] || '',
    lat: parseFloat(row[SHEET_COLUMNS.lat]) || 54.9894,
    lon: parseFloat(row[SHEET_COLUMNS.lon]) || 73.3667,
    yandex_link: row[SHEET_COLUMNS.yandex_link] || '',
    time: row[SHEET_COLUMNS.time] || '',
    payment_text: row[SHEET_COLUMNS.payment_text] || '',
    people: parseInt(row[SHEET_COLUMNS.people]) || 0,
    hours: parseInt(row[SHEET_COLUMNS.hours]) || 0,
    work_type: row[SHEET_COLUMNS.work_type] || '',
    comment: row[SHEET_COLUMNS.comment] || '',
    status: (row[SHEET_COLUMNS.status] as Order['status']) || 'pending',
    executor_id: row[SHEET_COLUMNS.executor_id] || '',
    message_id: row[SHEET_COLUMNS.message_id] || '',
    created_at: row[SHEET_COLUMNS.created_at] || '',
    client_rate: parseInt(row[SHEET_COLUMNS.client_rate], 10) || undefined,
    worker_rate: parseInt(row[SHEET_COLUMNS.worker_rate], 10) || undefined,
    client_total: parseInt(row[SHEET_COLUMNS.client_total], 10) || undefined,
    worker_payout: parseInt(row[SHEET_COLUMNS.worker_payout], 10) || undefined,
    margin: parseInt(row[SHEET_COLUMNS.margin], 10) || undefined,
    payout_status: row[SHEET_COLUMNS.payout_status] || undefined,
    payout_at: row[SHEET_COLUMNS.payout_at] || undefined,
    max_posted: row[SHEET_COLUMNS.max_posted] === 'TRUE',
    max_message_id: row[SHEET_COLUMNS.max_message_id] || undefined,
  };
}

export async function getOrders(statusFilter?: string): Promise<Order[]> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!sheetId || !apiKey) {
    console.error('Missing GOOGLE_SHEETS_ID or GOOGLE_API_KEY');
    return [];
  }

  const range = 'Orders!A2:Y1000';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = await res.json();
    const rows: string[][] = data.values ?? [];

    return rows
      .filter((row) => {
        if (!row[SHEET_COLUMNS.status]) return false;
        if (statusFilter) return row[SHEET_COLUMNS.status] === statusFilter;
        return true;
      })
      .map((row) => orderFromRow(row));
  } catch (error) {
    console.error('Failed to read Google Sheets:', error);
    return [];
  }
}

async function fetchOrdersSheetRows(): Promise<string[][]> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!sheetId || !apiKey) {
    console.error('Missing GOOGLE_SHEETS_ID or GOOGLE_API_KEY');
    return [];
  }

  const range = 'Orders!A2:Y1000';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return data.values ?? [];
}

export async function findOrderRowById(
  orderId: number
): Promise<{ order: Order; sheetRow: number } | null> {
  const rows = await fetchOrdersSheetRows();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const oid = parseInt(row[SHEET_COLUMNS.order_id]) || 0;
    if (oid === orderId) {
      return { order: orderFromRow(row), sheetRow: i + 2 };
    }
  }
  return null;
}

export async function getOrderById(orderId: number): Promise<Order | null> {
  const found = await findOrderRowById(orderId);
  return found?.order ?? null;
}

/**
 * Закрыть опубликованный заказ и назначить исполнителя. Требует сервисный аккаунт.
 */
export async function closePublishedOrder(
  orderId: number,
  executorId: string
): Promise<Order | null> {
  const found = await findOrderRowById(orderId);
  if (!found) return null;
  if (found.order.status !== 'published') {
    return null;
  }

  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEETS_ID_MISSING');
  }

  const headers = await getSheetsWriteHeaders();
  const range = `Orders!M${found.sheetRow}:N${found.sheetRow}`;
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const res = await fetch(putUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [['closed', executorId]],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('closePublishedOrder update failed:', res.status, text);
    throw new Error('ORDER_UPDATE_FAILED');
  }

  const updated: Order = {
    ...found.order,
    status: 'closed',
    executor_id: executorId,
  };
  return updated;
}

export interface WorkerStats {
  total_earned: number;
  pending_payout: number;
  paid_orders: number;
}

export async function getWorkerByTelegramId(
  telegramId: string
): Promise<Worker | null> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!sheetId || !apiKey) return null;

  const range = 'Workers!A2:P500';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = await res.json();
    const rows: string[][] = data.values ?? [];

    const row = rows.find((r) => r[WORKER_COLUMNS.telegram_id] === telegramId);
    if (!row) return null;

    return {
      telegram_id: row[WORKER_COLUMNS.telegram_id] || '',
      username: row[WORKER_COLUMNS.username] || '',
      name: row[WORKER_COLUMNS.name] || '',
      phone: row[WORKER_COLUMNS.phone] || '',
      rating: parseFloat(row[WORKER_COLUMNS.rating]) || 5.0,
      jobs_count: parseInt(row[WORKER_COLUMNS.jobs_count], 10) || 0,
      white_list: row[WORKER_COLUMNS.white_list] || 'FALSE',
      is_vip: row[WORKER_COLUMNS.is_vip] || 'FALSE',
      vip_expires_at: row[WORKER_COLUMNS.vip_expires_at] || undefined,
      skills: row[WORKER_COLUMNS.skills] || '',
      balance: parseInt(row[WORKER_COLUMNS.balance], 10) || 0,
      ban_until: row[WORKER_COLUMNS.ban_until] || undefined,
      created_at: row[WORKER_COLUMNS.created_at] || '',
      is_selfemployed: row[WORKER_COLUMNS.is_selfemployed] || undefined,
      card_last4: row[WORKER_COLUMNS.card_last4] || undefined,
      accepted_offer: row[WORKER_COLUMNS.accepted_offer] || undefined,
    };
  } catch (error) {
    console.error('getWorkerByTelegramId:', error);
    return null;
  }
}

export async function getWorkerStats(telegramId: string): Promise<WorkerStats> {
  const orders = await getOrders();
  const myOrders = orders.filter(
    (o) => o.executor_id === telegramId && o.status === 'closed'
  );

  let total_earned = 0;
  let pending_payout = 0;
  let paid_orders = 0;

  for (const o of myOrders) {
    const payout = o.worker_payout ?? 0;
    if (o.payout_status === 'paid') {
      total_earned += payout;
      paid_orders++;
    } else if (o.payout_status === 'pending' || !o.payout_status) {
      pending_payout += payout;
    }
  }

  return { total_earned, pending_payout, paid_orders };
}
