import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getOrderById, updateOrder, createDispute, getDisputesByOrder, updateDispute } from '@/lib/db';
import { getServiceClient } from '@/lib/supabase';
import { enqueueJob } from '@/lib/job-queue';

async function resolveExecutorPhone(
  contractorId?: string | null,
  executorId?: string | null,
): Promise<string | null> {
  if (contractorId) {
    const { data: contractor } = await getServiceClient()
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

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    let body: { initiatedBy?: unknown; reason?: unknown; description?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { initiatedBy, reason, description } = body;

    if (initiatedBy !== 'customer' && initiatedBy !== 'supplier') {
      return NextResponse.json(
        { error: 'initiatedBy must be customer or supplier' },
        { status: 400 }
      );
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    // Fetch order
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Cannot dispute completed or cancelled orders
    const orderStatus = String((order as Record<string, unknown>).status ?? '');
    if (orderStatus === 'completed' || orderStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot dispute a completed/cancelled order' },
        { status: 409 }
      );
    }

    // Create dispute record
    const dispute = await createDispute({
      order_id: id,
      initiated_by: initiatedBy,
      reason: reason.trim(),
      description: typeof description === 'string' ? description : undefined,
    });

    // Update order status to 'disputed'
    await updateOrder(id, { status: 'disputed' });

    try {
      await enqueueJob({
        queueName: 'disputes',
        jobType: 'dispute.opened',
        dedupeKey: `dispute.opened:${id}:${String((dispute as Record<string, unknown>).id)}`,
        payload: {
          event: 'dispute_opened',
          order_id: id,
          dispute_id: (dispute as Record<string, unknown>).id,
          initiated_by: initiatedBy,
          reason: reason.trim(),
          description: typeof description === 'string' ? description : null,
        },
        sourceTable: 'disputes',
        sourceId: String((dispute as Record<string, unknown>).id),
        createdBy: 'api/orders/dispute:post',
      });
    } catch (error) {
      console.error('enqueue dispute.opened failed (non-blocking):', error);
    }

    return NextResponse.json(
      { disputeId: (dispute as Record<string, unknown>).id, status: 'disputed' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/orders/[id]/dispute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH: разрешить спор (только для Admin) ──

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
    }

    let body: { pin?: unknown; resolution?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const pinStr = String(body.pin ?? '');
    const pinBuf = Buffer.from(pinStr);
    const expectedBuf = Buffer.from(adminPin);
    if (pinBuf.length !== expectedBuf.length || !timingSafeEqual(pinBuf, expectedBuf)) {
      return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 });
    }

    const resolution = body.resolution;
    if (resolution !== 'refund_full' && resolution !== 'release_payment') {
      return NextResponse.json(
        { error: 'resolution must be refund_full or release_payment' },
        { status: 400 }
      );
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const disputes = await getDisputesByOrder(id);
    const pendingDispute = disputes.find((d) => d.resolution === 'pending');
    if (!pendingDispute) {
      return NextResponse.json({ error: 'No pending dispute found' }, { status: 404 });
    }

    if (resolution === 'refund_full') {
      // Manual refund: admin will process payment return externally.
      // Mark order as cancelled so customer knows refund is in progress.
      await updateOrder(id, { status: 'cancelled' });
    } else {
      // release_payment: admin decided in favour of executor — mark completed.
      await updateOrder(id, { status: 'completed' });
    }

    const resolvedAt = new Date().toISOString();
    await updateDispute(String(pendingDispute.id), {
      resolution,
      resolved_at: resolvedAt,
    });

    const executorPhone = await resolveExecutorPhone(
      (order as Record<string, unknown>).contractor_id != null
        ? String((order as Record<string, unknown>).contractor_id)
        : null,
      (order as Record<string, unknown>).executor_id != null
        ? String((order as Record<string, unknown>).executor_id)
        : null,
    );

    try {
      await enqueueJob({
        queueName: 'disputes',
        jobType: 'dispute.resolved',
        dedupeKey: `dispute.resolved:${id}:${String(pendingDispute.id)}:${resolution}`,
        payload: {
          event: 'dispute_resolved',
          order_id: id,
          dispute_id: pendingDispute.id,
          resolution,
          resolved_at: resolvedAt,
          customer_phone: (order as Record<string, unknown>).customer_phone,
          executor_phone: executorPhone,
        },
        sourceTable: 'disputes',
        sourceId: String(pendingDispute.id),
        createdBy: 'api/orders/dispute:patch',
      });
    } catch (error) {
      console.error('enqueue dispute.resolved failed (non-blocking):', error);
    }

    return NextResponse.json({ ok: true, resolution });
  } catch (error) {
    console.error('PATCH /api/orders/[id]/dispute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
