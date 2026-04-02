import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

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
    .from('disputes')
    .select('*, orders(order_id, escrow_status, customer_total, supplier_payout, yookassa_payment_id, payment_captured)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('GET /api/admin/disputes error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, disputes: data || [] });
}
