import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

async function resolveExecutorPhone(
  supabase: ReturnType<typeof getServiceClient>,
  contractorId?: string | null,
  executorId?: string | null,
): Promise<string | null> {
  if (contractorId) {
    const { data: contractor } = await supabase
      .from('contractors')
      .select('phone')
      .eq('id', contractorId)
      .maybeSingle();

    if (contractor?.phone) {
      return String(contractor.phone);
    }
  }

  if (!executorId) {
    return null;
  }

  const rawExecutorId = String(executorId);
  const regMatch = rawExecutorId.match(/^reg:(\d+)$/);
  if (regMatch) {
    return regMatch[1];
  }

  return /^\d{10,}$/.test(rawExecutorId) ? rawExecutorId : null;
}

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
    .select('order_id, order_number, customer_phone, customer_name, work_type, display_price, customer_total, supplier_payout, contractor_id, executor_id, address')
    .single();

  if (error) {
    log.error('payment-status PUT', { error: String(error) });
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const executorPhone = await resolveExecutorPhone(
    supabase,
    updated?.contractor_id != null ? String(updated.contractor_id) : null,
    updated?.executor_id != null ? String(updated.executor_id) : null,
  );

  if (payment_status === 'paid') {
    try {
      await enqueueJob({
        queueName: 'notifications',
        jobType: 'notify.payment_held',
        dedupeKey: `notify.payment_held:${orderId}:${String(updates.payment_paid_at)}`,
        payload: {
          event: 'payment_held',
          order_id: orderId,
          customer_phone: updated?.customer_phone,
          customer_name: updated?.customer_name,
          work_type: updated?.work_type,
          amount: updated?.display_price ?? updated?.customer_total,
          address: updated?.address,
          paid_at: updates.payment_paid_at,
        },
        sourceTable: 'orders',
        sourceId: orderId,
        createdBy: 'api/admin/orders/payment-status',
      });
    } catch (error) {
      log.error('enqueue notify.payment_held failed (non-blocking)', { error: String(error) });
    }
  }

  if (executor_payout_status === 'paid') {
    try {
      await enqueueJob({
        queueName: 'notifications',
        jobType: 'notify.payout_initiated',
        dedupeKey: `notify.payout_initiated:${orderId}:${String(updates.executor_payout_at)}`,
        payload: {
          event: 'executor_payout_paid',
          order_id: orderId,
          executor_phone: executorPhone,
          work_type: updated?.work_type,
          payout_amount: updated?.supplier_payout,
          paid_at: updates.executor_payout_at,
        },
        sourceTable: 'orders',
        sourceId: orderId,
        createdBy: 'api/admin/orders/payment-status',
      });
    } catch (error) {
      log.error('enqueue notify.payout_initiated failed (non-blocking)', { error: String(error) });
    }

    // Also notify the contractor directly
    if (executorPhone) {
      try {
        await enqueueJob({
          queueName: 'notifications',
          jobType: 'notify.contractor_payout_sent',
          dedupeKey: `contractor_payout:${orderId}`,
          payload: {
            contractor_phone: executorPhone,
            order_id: orderId,
            order_number: updated?.order_number,
            payout_amount: updated?.supplier_payout,
            paid_at: updates.executor_payout_at,
          },
          sourceTable: 'orders',
          sourceId: orderId,
          createdBy: 'api/admin/orders/payment-status',
        });
      } catch (error) {
        log.error('enqueue notify.contractor_payout_sent failed (non-blocking)', { error: String(error) });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
