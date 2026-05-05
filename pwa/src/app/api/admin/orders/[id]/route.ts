import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { getMarkupRate } from '@/lib/pricing';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

const VALID_STATUSES = [
  'pending',
  'priced',
  'payment_sent',
  'paid',
  'in_progress',
  'confirming',
  'completed',
  'disputed',
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

  let body: { display_price?: number; contractor_id?: string; status?: string; address?: string; work_date?: string; hours?: number | null; people_count?: number | null; customer_comment?: string; customer_name?: string; customer_phone?: string; supplier_payout?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { display_price, contractor_id, status, address, work_date, hours, people_count, customer_comment, customer_name, customer_phone, supplier_payout } = body;

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
  if (address !== undefined) updates.address = String(address);
  if (work_date !== undefined) updates.work_date = String(work_date);
  if (hours !== undefined) updates.hours = hours;
  if (people_count !== undefined) updates.people_count = people_count;
  if (customer_comment !== undefined) updates.customer_comment = String(customer_comment);
  if (customer_name !== undefined) updates.customer_name = String(customer_name);
  if (customer_phone !== undefined) updates.customer_phone = String(customer_phone);

  // Auto-calculate supplier_payout and platform_margin when display_price is set
  if (display_price !== undefined) {
    if (supplier_payout !== undefined && typeof supplier_payout === 'number' && supplier_payout >= 0) {
      // Admin explicitly set supplier_payout
      updates.supplier_payout = supplier_payout;
      updates.platform_margin = Math.round((display_price - supplier_payout) * 100) / 100;
    } else {
      // Auto-derive from markup rate based on order's work_type
      const db = getServiceClient();
      const { data: order } = await db
        .from('orders')
        .select('work_type, subcategory')
        .eq('order_id', orderId)
        .maybeSingle();

      const workType = order?.work_type || 'labor';
      const subcategory = order?.subcategory || undefined;
      const markupPercent = await getMarkupRate(db, workType, undefined, subcategory);
      const derivedSupplierPayout = Math.round((display_price / (1 + markupPercent / 100)) * 100) / 100;
      updates.supplier_payout = derivedSupplierPayout;
      updates.platform_margin = Math.round((display_price - derivedSupplierPayout) * 100) / 100;
    }
  }

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
      log.error(`PUT /api/admin/orders/${orderId}`, { error: String(error) });
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // Notify contractor when assigned (contractor_id set or updated)
    if (contractor_id) {
      const rawBody = body as Record<string, unknown>;
      void enqueueJob({
        queueName: 'notifications',
        jobType: 'notify.order_assigned_to_contractor',
        dedupeKey: `assign:${orderId}`,
        payload: {
          contractor_phone: contractor_id,
          order_id: orderId,
          order_number: rawBody.order_number,
          work_type: rawBody.work_type,
          display_price,
          address: rawBody.address,
          work_date: rawBody.work_date,
          customer_phone: rawBody.customer_phone,
        },
      }).catch((err) => {
        log.error(`PUT /api/admin/orders/${orderId} assign notify`, { error: String(err) });
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error(`PUT /api/admin/orders/${orderId}`, { error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
