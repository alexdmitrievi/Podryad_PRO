import { NextResponse } from 'next/server';
import { DEFAULT_RATES, type Rate } from '@/lib/rates';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const API_KEY = process.env.GOOGLE_API_KEY;

export async function GET() {
  if (!SHEET_ID || !API_KEY) {
    return NextResponse.json(DEFAULT_RATES);
  }

  try {
    const range = 'Rates!A2:G100';
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const rows: (string | number | boolean)[][] = data.values ?? [];

    const rates: Rate[] = rows
      .filter((row) => row[0] && row[5] !== 'FALSE')
      .map((row) => ({
        work_type: String(row[0] ?? ''),
        client_rate: parseInt(String(row[1]), 10) || 600,
        worker_rate: parseInt(String(row[2]), 10) || 400,
        margin: parseInt(String(row[3]), 10) || 200,
        min_hours: parseInt(String(row[4]), 10) || 1,
      }));

    if (rates.length === 0) return NextResponse.json(DEFAULT_RATES);
    return NextResponse.json(rates);
  } catch {
    return NextResponse.json(DEFAULT_RATES);
  }
}
