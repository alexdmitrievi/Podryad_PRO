import { NextResponse } from 'next/server';
import { createEscrowPayment } from '@/lib/yukassa';
import { getOrderById, updateOrder } from '@/lib/db';

interface CreateEscrowRequest {
  orderId: string;
  customerTotal: number;
  supplierPayout: number;
  platformMargin: number;
  comboDiscount?: number;
  orderNumber?: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryad.pro';

export async function POST(req: Request) {
  try {
    let body: CreateEscrowRequest;
    try {
      body = (await req.json()) as CreateEscrowRequest;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    if (!body.customerTotal || body.customerTotal <= 0) {
      return NextResponse.json({ error: 'customerTotal must be greater than 0' }, { status: 400 });
    }
    if (!body.supplierPayout || body.supplierPayout <= 0) {
      return NextResponse.json({ error: 'supplierPayout must be greater than 0' }, { status: 400 });
    }
    if (!body.customerPhone) {
      return NextResponse.json({ error: 'customerPhone is required' }, { status: 400 });
    }

    const { orderId } = body;

    // Fetch order — return 404 if not found
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Idempotency check: reject if payment already initiated
    const currentStatus = (order as Record<string, unknown>).escrow_status as string | undefined | null;
    if (currentStatus && currentStatus !== '') {
      return NextResponse.json(
        { error: 'Payment already initiated', escrow_status: currentStatus },
        { status: 409 }
      );
    }

    const orderNumber = body.orderNumber || String((order as Record<string, unknown>).order_number ?? orderId);

    // Generate idempotence key
    const idempotenceKey = `escrow-${orderId}-${Date.now()}`;

    // Determine return URL
    const returnUrl = body.returnUrl || `${APP_URL}/order/${orderId}/status`;

    // Create YooKassa escrow payment (capture:false — 2-stage hold)
    const payment = await createEscrowPayment({
      customerTotal: body.customerTotal,
      orderNumber,
      description: `Заказ ${orderNumber}`,
      returnUrl,
      orderId,
      customerPhone: body.customerPhone,
      idempotenceKey,
    });

    // Update order with escrow financial fields
    await updateOrder(orderId, {
      customer_total: body.customerTotal,
      supplier_payout: body.supplierPayout,
      platform_margin: body.platformMargin,
      combo_discount: body.comboDiscount ?? 0,
      yookassa_payment_id: payment.id,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail || null,
    });

    return NextResponse.json({
      confirmationUrl: payment.confirmationUrl,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('POST /api/payments/create-escrow error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
