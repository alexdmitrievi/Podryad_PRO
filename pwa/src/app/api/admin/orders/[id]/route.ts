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

const VALID_STATUSES = [
  'new',
  'priced',
  'payment_sent',
  'paid',
  'in_progress',
  'completed',
  'closed',
  'cancelled',
] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orderId } = await params;

  let body: { display_price?: number; contractor_id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { display_price, contractor_id, status } = body;

  // Validate display_price if present
  if (display_price !== undefined && (typeof display_price !== 'number' || display_price <= 0)) {
    return NextResponse.json({ error: 'display_price must be a positive number' }, { status: 400 });
  }

  // Validate status if present
  if (status !== undefined && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (display_price !== undefined) {
    updates.display_price = display_price;
    updates.customer_total = display_price;
  }
  if (contractor_id !== undefined) updates.contractor_id = contractor_id;

  // Auto-set status to 'priced' when price + contractor assigned but no explicit status
  if (status !== undefined) {
    updates.status = status;
  } else if (display_price !== undefined && contractor_id !== undefined) {
    updates.status = 'priced';
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const { error } = await getServiceClient()
      .from('orders')
      .update(updates)
      .eq('order_id', orderId);

    if (error) {
      console.error(`PUT /api/admin/orders/${orderId}:`, error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PUT /api/admin/orders/${orderId}:`, err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
