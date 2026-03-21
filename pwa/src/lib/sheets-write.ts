import { google } from 'googleapis';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Service Account not configured');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

// Добавить строку в вкладку
export async function appendRow(
  sheetName: string,
  values: (string | number)[]
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

// Обновить строку по ключу (колонка A = ключ)
export async function updateRow(
  sheetName: string,
  matchColumn: string,
  matchValue: string,
  updates: Record<string, string | number>
): Promise<void> {
  const sheets = getSheets();

  // 1. Прочитать заголовки
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = headerRes.data.values?.[0] || [];

  // 2. Прочитать все данные
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  const rows = dataRes.data.values || [];

  // 3. Найти строку
  const matchColIdx = headers.indexOf(matchColumn);
  if (matchColIdx === -1) throw new Error(`Column ${matchColumn} not found`);

  const rowIdx = rows.findIndex(
    (row, i) => i > 0 && row[matchColIdx] === matchValue
  );
  if (rowIdx === -1)
    throw new Error(`Row with ${matchColumn}=${matchValue} not found`);

  // 4. Обновить нужные ячейки
  const row = [...rows[rowIdx]];
  for (const [col, val] of Object.entries(updates)) {
    const colIdx = headers.indexOf(col);
    if (colIdx !== -1) {
      row[colIdx] = String(val);
    }
  }

  const range = `${sheetName}!A${rowIdx + 1}:Z${rowIdx + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

// Прочитать строку по ключу
export async function readRow(
  sheetName: string,
  matchColumn: string,
  matchValue: string
): Promise<Record<string, string> | null> {
  const sheets = getSheets();

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = headerRes.data.values?.[0] || [];

  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  const rows = dataRes.data.values || [];

  const matchColIdx = headers.indexOf(matchColumn);
  if (matchColIdx === -1) return null;

  const row = rows.find((r, i) => i > 0 && r[matchColIdx] === matchValue);
  if (!row) return null;

  const result: Record<string, string> = {};
  headers.forEach((h: string, i: number) => {
    result[h] = row[i] || '';
  });
  return result;
}
