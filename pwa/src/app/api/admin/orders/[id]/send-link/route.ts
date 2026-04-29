import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { getOrCreateCustomerToken } from '@/lib/db';
import { enqueueJob } from '@/lib/job-queue';

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

  // Fetch order
  const { data: order, error: orderError } = await getServiceClient()
    .from('orders')
    .select('customer_phone, preferred_contact, display_price, order_id')
    .eq('order_id', orderId)
    .single();

  if (orderError || !order) {
    console.error(`POST /api/admin/orders/${orderId}/send-link: order not found`, orderError);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!order.customer_phone) {
    return NextResponse.json({ error: 'Order has no customer_phone' }, { status: 422 });
  }

  // Get or create customer token
  let tokenRecord: Record<string, unknown>;
  try {
    tokenRecord = await getOrCreateCustomerToken(
      order.customer_phone,
      order.preferred_contact ?? undefined
    ) as Record<string, unknown>;
  } catch (err) {
    console.error(`POST /api/admin/orders/${orderId}/send-link: token error`, err);
    return NextResponse.json({ error: 'Token error' }, { status: 500 });
  }

  const access_token = tokenRecord.access_token as string;
  const messenger_id = tokenRecord.messenger_id as string | undefined;

  // Update order status to payment_sent
  const { error: updateError } = await getServiceClient()
    .from('orders')
    .update({ status: 'payment_sent' })
    .eq('order_id', orderId);

  if (updateError) {
    console.error(`POST /api/admin/orders/${orderId}/send-link: update error`, updateError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  try {
    await enqueueJob({
      queueName: 'customer',
      jobType: 'customer.send_payment_link',
      dedupeKey: `customer.send_payment_link:${orderId}:${access_token}`,
      payload: {
        order_id: orderId,
        phone: order.customer_phone,
        access_token,
        preferred_contact: order.preferred_contact ?? null,
        messenger_id: messenger_id ?? null,
        display_price: order.display_price ?? null,
      },
      sourceTable: 'orders',
      sourceId: orderId,
      createdBy: 'api/admin/orders/send-link',
    });
  } catch (error) {
    console.error(`enqueue customer.send_payment_link failed for order ${orderId} (non-blocking):`, error);
  }

  return NextResponse.json({ ok: true, access_token });
}
