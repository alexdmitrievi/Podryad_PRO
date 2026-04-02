import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { orderFromDb } from '@/lib/db';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('orders')
    .select('order_id, status, escrow_status, customer_total, supplier_payout, platform_margin, order_number, created_at, payment_captured')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('GET /api/admin/orders error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const orders = (data || []).map((row) =>
    orderFromDb(row as Record<string, unknown>)
  );

  return NextResponse.json({ ok: true, orders });
}
