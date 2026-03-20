import { JWT } from 'google-auth-library';
import type { PushSubscriptionData } from './push';

const SHEET_TAB = 'PushSubs';
const RANGE_APPEND = `${SHEET_TAB}!A:H`;
const RANGE_DATA = `${SHEET_TAB}!A2:H5000`;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getJwtClient(): JWT | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new JWT({
    email,
    key,
    scopes: SCOPES,
  });
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const client = getJwtClient();
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

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID_MISSING');
  return id;
}

function parseIsActive(h: string | undefined): boolean {
  if (h === undefined || h === '') return true;
  const v = h.trim().toUpperCase();
  return v === 'TRUE' || v === '1';
}

interface ParsedRow {
  sheetRow: number;
  userId: string;
  phone: string;
  role: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  isActive: boolean;
}

function parseRow(sheetRow: number, cells: string[]): ParsedRow | null {
  if (cells.length < 6) return null;
  const userId = cells[0]?.trim() ?? '';
  const phone = cells[1]?.trim() ?? '';
  const role = cells[2]?.trim() ?? '';
  const endpoint = cells[3]?.trim() ?? '';
  const p256dh = cells[4]?.trim() ?? '';
  const auth = cells[5]?.trim() ?? '';
  if (!endpoint || !p256dh || !auth) return null;
  return {
    sheetRow,
    userId,
    phone,
    role,
    endpoint,
    keys: { p256dh, auth },
    isActive: parseIsActive(cells[7]),
  };
}

function phoneDigits(p: string): string {
  return p.replace(/\D/g, '');
}

async function fetchAllParsedRows(): Promise<ParsedRow[]> {
  const headers = await getAuthHeaders();
  const sheetId = getSpreadsheetId();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    RANGE_DATA
  )}`;

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    console.error('PushSubs read failed:', res.status, text);
    throw new Error('PUSHSUBS_READ_FAILED');
  }

  const data: { values?: string[][] } = await res.json();
  const rows = data.values ?? [];
  const out: ParsedRow[] = [];
  rows.forEach((cells, i) => {
    const sheetRow = i + 2;
    const parsed = parseRow(sheetRow, cells);
    if (parsed) out.push(parsed);
  });
  return out;
}

/** Сохранить подписку (вставка или обновление строки с тем же endpoint). */
export async function savePushSubscription(
  userId: string,
  phone: string,
  role: string,
  subscription: PushSubscriptionData
): Promise<void> {
  const headers = await getAuthHeaders();
  const sheetId = getSpreadsheetId();
  const createdAt = new Date().toISOString();
  const isActive = 'TRUE';

  const all = await fetchAllParsedRows();
  const existing = all.find((r) => r.endpoint === subscription.endpoint);

  const rowValues = [
    userId,
    phone,
    role,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    createdAt,
    isActive,
  ];

  if (existing) {
    const range = `${SHEET_TAB}!A${existing.sheetRow}:H${existing.sheetRow}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`;

    const put = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ values: [rowValues] }),
    });

    if (!put.ok) {
      const text = await put.text();
      console.error('PushSubs update failed:', put.status, text);
      throw new Error('PUSHSUBS_WRITE_FAILED');
    }
    return;
  }

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    RANGE_APPEND
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const post = await fetch(appendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!post.ok) {
    const text = await post.text();
    console.error('PushSubs append failed:', post.status, text);
    throw new Error('PUSHSUBS_WRITE_FAILED');
  }
}

/** Найти подписки по user_id */
export async function findPushSubscriptions(
  userId: string
): Promise<PushSubscriptionData[]> {
  const all = await fetchAllParsedRows();
  return all
    .filter((r) => r.userId === userId && r.isActive)
    .map((r) => ({
      endpoint: r.endpoint,
      keys: r.keys,
    }));
}

/** Найти подписки по телефону */
export async function findPushSubscriptionsByPhone(
  phone: string
): Promise<PushSubscriptionData[]> {
  const digits = phoneDigits(phone);
  const all = await fetchAllParsedRows();
  return all
    .filter(
      (r) => r.isActive && digits.length > 0 && phoneDigits(r.phone) === digits
    )
    .map((r) => ({
      endpoint: r.endpoint,
      keys: r.keys,
    }));
}

/** Найти подписки по роли */
export async function findPushSubscriptionsByRole(
  role: string
): Promise<PushSubscriptionData[]> {
  const all = await fetchAllParsedRows();
  return all
    .filter((r) => r.isActive && r.role === role)
    .map((r) => ({
      endpoint: r.endpoint,
      keys: r.keys,
    }));
}

/** Подписки для рассылки с привязкой к user_id (для деактивации при 410). */
export async function listPushSubscriptionsForSend(filter: {
  userId?: string;
  phone?: string;
  role?: string;
}): Promise<Array<{ userId: string; subscription: PushSubscriptionData }>> {
  const all = await fetchAllParsedRows();
  const digits = filter.phone ? phoneDigits(filter.phone) : '';

  const matched = all.filter((r) => {
    if (!r.isActive) return false;
    if (filter.userId !== undefined) return r.userId === filter.userId;
    if (filter.phone !== undefined) {
      return digits.length > 0 && phoneDigits(r.phone) === digits;
    }
    if (filter.role !== undefined) return r.role === filter.role;
    return false;
  });

  const seen = new Set<string>();
  const out: Array<{ userId: string; subscription: PushSubscriptionData }> = [];
  for (const r of matched) {
    if (seen.has(r.endpoint)) continue;
    seen.add(r.endpoint);
    out.push({
      userId: r.userId,
      subscription: { endpoint: r.endpoint, keys: r.keys },
    });
  }
  return out;
}

/** Деактивировать подписку по endpoint и user_id */
export async function deactivatePushSubscription(
  endpoint: string,
  userId: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const sheetId = getSpreadsheetId();
  const all = await fetchAllParsedRows();
  const row = all.find((r) => r.endpoint === endpoint && r.userId === userId);
  if (!row) return;

  const range = `${SHEET_TAB}!H${row.sheetRow}:H${row.sheetRow}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const put = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ values: [['FALSE']] }),
  });

  if (!put.ok) {
    const text = await put.text();
    console.error('PushSubs deactivate failed:', put.status, text);
    throw new Error('PUSHSUBS_WRITE_FAILED');
  }
}
