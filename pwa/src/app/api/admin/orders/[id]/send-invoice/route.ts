import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orderId } = await params;

  let body: { customer_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const customerType = body.customer_type === 'legal_entity' ? 'legal_entity' : 'individual';

  // Fetch order
  const supabase = getServiceClient();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('customer_phone, customer_name, preferred_contact, display_price, order_number, order_id')
    .eq('order_id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Update order: customer_type, payment_status, payment_sent_at
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      customer_type: customerType,
      payment_status: 'invoice_sent',
      payment_sent_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);

  if (updateError) {
    log.error(`POST /api/admin/orders/${orderId}/send-invoice`, { error: String(updateError) });
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Look up messenger_id for direct customer delivery
  const { data: tokenRow } = await supabase
    .from('customer_tokens')
    .select('messenger_id, preferred_contact')
    .eq('phone', order.customer_phone)
    .maybeSingle();

  void enqueueJob({
    queueName: 'customer',
    jobType: 'customer.send_invoice',
    dedupeKey: `customer.send_invoice:${orderId}:${customerType}`,
    payload: {
      order_id: orderId,
      order_number: order.order_number ?? orderId,
      customer_type: customerType,
      amount: order.display_price ?? null,
      customer_name: order.customer_name ?? null,
      customer_phone: order.customer_phone ?? null,
      preferred_contact: tokenRow?.preferred_contact ?? order.preferred_contact ?? null,
      messenger_id: tokenRow?.messenger_id ?? null,
    },
    sourceTable: 'orders',
    sourceId: orderId,
  }).catch(err => log.error('enqueueJob customer.send_invoice error (non-blocking)', { error: String(err) }));

  return NextResponse.json({ ok: true, customer_type: customerType });
}
