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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orderId } = await params;

  let body: { payment_status?: string; executor_payout_status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { payment_status, executor_payout_status } = body;

  const updates: Record<string, unknown> = {};

  if (payment_status !== undefined) {
    const valid = ['pending', 'invoice_sent', 'paid', 'overdue'];
    if (!valid.includes(payment_status)) {
      return NextResponse.json({ error: 'Invalid payment_status' }, { status: 400 });
    }
    updates.payment_status = payment_status;
    if (payment_status === 'paid') {
      updates.payment_paid_at = new Date().toISOString();
      updates.status = 'paid';
    }
  }

  if (executor_payout_status !== undefined) {
    const valid = ['pending', 'paid'];
    if (!valid.includes(executor_payout_status)) {
      return NextResponse.json({ error: 'Invalid executor_payout_status' }, { status: 400 });
    }
    updates.executor_payout_status = executor_payout_status;
    if (executor_payout_status === 'paid') {
      updates.executor_payout_at = new Date().toISOString();
      updates.status = 'completed';
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('order_id', orderId);

  if (error) {
    console.error('payment-status PUT:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
