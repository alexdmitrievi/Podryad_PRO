import { Order } from './types';

const SHEET_COLUMNS = {
  order_id: 0,
  customer_id: 1,
  address: 2,
  lat: 3,
  lon: 4,
  yandex_link: 5,
  time: 6,
  payment: 7,
  people: 8,
  hours: 9,
  work_type: 10,
  comment: 11,
  status: 12,
  executor_id: 13,
  message_id: 14,
  created_at: 15,
};

export async function getOrders(statusFilter?: string): Promise<Order[]> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!sheetId || !apiKey) {
    console.error('Missing GOOGLE_SHEETS_ID or GOOGLE_API_KEY');
    return [];
  }

  const range = 'Orders!A2:P1000';
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
      .map((row) => ({
        order_id: parseInt(row[SHEET_COLUMNS.order_id]) || 0,
        customer_id: row[SHEET_COLUMNS.customer_id] || '',
        address: row[SHEET_COLUMNS.address] || '',
        lat: parseFloat(row[SHEET_COLUMNS.lat]) || 54.9894,
        lon: parseFloat(row[SHEET_COLUMNS.lon]) || 73.3667,
        yandex_link: row[SHEET_COLUMNS.yandex_link] || '',
        time: row[SHEET_COLUMNS.time] || '',
        payment: row[SHEET_COLUMNS.payment] || '',
        people: parseInt(row[SHEET_COLUMNS.people]) || 0,
        hours: parseInt(row[SHEET_COLUMNS.hours]) || 0,
        work_type: row[SHEET_COLUMNS.work_type] || '',
        comment: row[SHEET_COLUMNS.comment] || '',
        status: (row[SHEET_COLUMNS.status] as Order['status']) || 'pending',
        executor_id: row[SHEET_COLUMNS.executor_id] || '',
        message_id: row[SHEET_COLUMNS.message_id] || '',
        created_at: row[SHEET_COLUMNS.created_at] || '',
      }));
  } catch (error) {
    console.error('Failed to read Google Sheets:', error);
    return [];
  }
}
