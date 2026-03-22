import { NextResponse } from 'next/server';
import { DEFAULT_RATES, type Rate } from '@/lib/rates';
import { getRates } from '@/lib/db';

function mapRowsToRates(rows: Record<string, unknown>[]): Rate[] {
  return rows.map((row) => ({
    work_type: String(row.work_type ?? ''),
    client_rate: Number(row.client_rate) || 600,
    worker_rate: Number(row.worker_rate) || 400,
    margin: Number(row.margin) || 200,
    min_hours: row.min_hours != null ? Number(row.min_hours) || 1 : 1,
  }));
}

export async function GET() {
  try {
    const rows = await getRates();
    const rates = mapRowsToRates(rows as Record<string, unknown>[]);
    if (rates.length === 0) return NextResponse.json(DEFAULT_RATES);
    return NextResponse.json(rates);
  } catch (e) {
    console.error('GET /api/rates:', e);
    return NextResponse.json(DEFAULT_RATES);
  }
}
