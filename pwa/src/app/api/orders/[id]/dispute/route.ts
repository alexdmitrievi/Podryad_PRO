import { NextResponse } from 'next/server';
import { getOrderById, updateOrder, createDispute } from '@/lib/db';

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
    const escrowStatus = String(order.escrow_status ?? '');
    if (escrowStatus === 'completed' || escrowStatus === 'cancelled') {
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

    // Update escrow_status to 'disputed'
    await updateOrder(id, { escrow_status: 'disputed' });

    return NextResponse.json(
      { disputeId: (dispute as Record<string, unknown>).id, status: 'disputed' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/orders/[id]/dispute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
