export interface Order {
  order_id: number;
  customer_id: string;
  address: string;
  lat: number;
  lon: number;
  yandex_link: string;
  time: string;
  payment: string;
  people: number;
  hours: number;
  work_type: string;
  comment: string;
  status: string;
  executor_id: string;
  message_id: string;
  created_at: string;
}

export interface Worker {
  telegram_id: string;
  username: string;
  name: string;
  phone: string;
  rating: number;
  jobs_count: number;
  white_list: boolean;
  is_vip: boolean;
  vip_expires_at: string;
  skills: string;
  balance: number;
  ban_until: string;
  created_at: string;
}

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function getSheetUrl(range: string): string {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!sheetId || !apiKey) {
    throw new Error('Missing GOOGLE_SHEETS_ID or GOOGLE_API_KEY env vars');
  }
  return `${SHEETS_BASE}/${sheetId}/values/${range}?key=${apiKey}`;
}

export async function fetchOrders(statusFilter?: string): Promise<Order[]> {
  const url = getSheetUrl('Orders!A2:P1000');

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);

  const data = await res.json();
  const rows: string[][] = data.values ?? [];

  const orders: Order[] = rows
    .filter((row) => row.length >= 3)
    .map((row) => ({
      order_id: parseInt(row[0]) || 0,
      customer_id: row[1] || '',
      address: row[2] || '',
      lat: parseFloat(row[3]) || 54.9894,
      lon: parseFloat(row[4]) || 73.3667,
      yandex_link: row[5] || '',
      time: row[6] || '',
      payment: row[7] || '',
      people: parseInt(row[8]) || 0,
      hours: parseInt(row[9]) || 0,
      work_type: row[10] || '',
      comment: row[11] || '',
      status: row[12] || '',
      executor_id: row[13] || '',
      message_id: row[14] || '',
      created_at: row[15] || '',
    }));

  if (statusFilter) {
    return orders.filter((o) => o.status === statusFilter);
  }

  return orders;
}

export async function fetchWorkers(): Promise<Worker[]> {
  const url = getSheetUrl('Workers!A2:N1000');

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);

  const data = await res.json();
  const rows: string[][] = data.values ?? [];

  return rows
    .filter((row) => row.length >= 3 && row[0])
    .map((row) => ({
      telegram_id: row[0] || '',
      username: row[1] || '',
      name: row[2] || '',
      phone: row[3] || '',
      rating: parseFloat(row[4]) || 5.0,
      jobs_count: parseInt(row[5]) || 0,
      white_list: row[6] === 'TRUE',
      is_vip: row[7] === 'TRUE',
      vip_expires_at: row[8] || '',
      skills: row[9] || '',
      balance: parseInt(row[10]) || 0,
      ban_until: row[11] || '',
      created_at: row[12] || '',
    }));
}
