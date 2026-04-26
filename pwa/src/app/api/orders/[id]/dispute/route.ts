import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getOrderById, updateOrder, createDispute, getDisputesByOrder, updateDispute, getContractorById } from '@/lib/db';

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

    // Fire-and-forget: admin notification on dispute opened
    const openedUrl = process.env.N8N_DISPUTE_OPENED_WEBHOOK_URL;
    if (openedUrl) {
      fetch(openedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'dispute_opened',
          order_id: id,
          dispute_id: (dispute as Record<string, unknown>).id,
          initiated_by: initiatedBy,
          reason: reason.trim(),
          description: typeof description === 'string' ? description : null,
        }),
      }).catch((err) => console.error('n8n dispute_opened webhook error (non-blocking):', err));
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

    // executor_phone хранится в contractors, не в orders. Подтянем по contractor_id.
    const contractorId = (order as Record<string, unknown>).contractor_id;
    let executorPhone: string | null = null;
    if (typeof contractorId === 'string' && contractorId) {
      try {
        const contractor = await getContractorById(contractorId);
        executorPhone = (contractor as Record<string, unknown> | null)?.phone as string ?? null;
      } catch { /* контрактор может быть удалён — оставим null */ }
    }

    // Fire-and-forget: notify both sides when dispute is resolved
    const resolvedUrl = process.env.N8N_DISPUTE_RESOLVED_WEBHOOK_URL;
    if (resolvedUrl) {
      fetch(resolvedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'dispute_resolved',
          order_id: id,
          dispute_id: pendingDispute.id,
          resolution,
          resolved_at: resolvedAt,
          customer_phone: (order as Record<string, unknown>).customer_phone,
          executor_phone: executorPhone,
        }),
      }).catch((err) => console.error('n8n dispute_resolved webhook error (non-blocking):', err));
    }

    return NextResponse.json({ ok: true, resolution });
  } catch (error) {
    console.error('PATCH /api/orders/[id]/dispute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
