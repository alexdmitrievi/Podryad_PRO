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
  const { data: updated, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('order_id', orderId)
    .select('order_id, customer_phone, customer_name, work_type, display_price, customer_total, supplier_payout, address, contractor:contractors(phone)')
    .single();

  if (error) {
    console.error('payment-status PUT:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Supabase возвращает join либо как массив, либо как объект — нормализуем.
  const contractorRel = (updated as Record<string, unknown> | null)?.contractor;
  const executorPhone = Array.isArray(contractorRel)
    ? (contractorRel[0] as { phone?: string } | undefined)?.phone
    : (contractorRel as { phone?: string } | null | undefined)?.phone;

  // Fire-and-forget webhooks on state transitions
  if (payment_status === 'paid') {
    const url = process.env.N8N_PAYMENT_HELD_WEBHOOK_URL;
    if (url) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment_held',
          order_id: orderId,
          customer_phone: updated?.customer_phone,
          customer_name: updated?.customer_name,
          work_type: updated?.work_type,
          amount: updated?.display_price ?? updated?.customer_total,
          address: updated?.address,
          paid_at: updates.payment_paid_at,
        }),
      }).catch((err) => console.error('n8n payment_held webhook error (non-blocking):', err));
    }
  }

  if (executor_payout_status === 'paid') {
    const url = process.env.N8N_PAYOUT_WEBHOOK_URL;
    if (url) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'executor_payout_paid',
          order_id: orderId,
          executor_phone: executorPhone ?? null,
          work_type: updated?.work_type,
          payout_amount: updated?.supplier_payout,
          paid_at: updates.executor_payout_at,
        }),
      }).catch((err) => console.error('n8n payout webhook error (non-blocking):', err));
    }
  }

  return NextResponse.json({ ok: true });
}
