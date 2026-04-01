import { NextResponse } from 'next/server';
import { getOrdersWithExpiringHolds, updateOrder, insertEscrowLedger } from '@/lib/db';
import { capturePayment } from '@/lib/yukassa';

function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const cronHeader = req.headers.get('x-cron-secret');
  if (cronHeader === secret) return true;

  return false;
}

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orders = await getOrdersWithExpiringHolds();
  let processed = 0;

  for (const order of orders) {
    const orderId = String(order.order_id);
    const paymentId = String(order.yookassa_payment_id ?? '');

    if (!paymentId) continue;

    try {
      const captureKey = `auto-capture-${orderId}-${Date.now()}`;
      await capturePayment(paymentId, captureKey);

      // Atomic check: only update if still not captured (prevents double-capture)
      await updateOrder(orderId, {
        payment_captured: true,
        payment_captured_at: new Date().toISOString(),
        escrow_status: 'completed',
      });

      await insertEscrowLedger({
        order_id: orderId,
        type: 'capture',
        amount: Number(order.total) || 0,
        yookassa_operation_id: paymentId,
        note: 'Auto-captured by cron (6-day expiry)',
      });

      console.log(`Auto-captured: order=${orderId} payment=${paymentId}`);
      processed++;
    } catch (err) {
      console.error(`Auto-capture failed for order ${orderId}:`, err);
      // Continue with next order — don't let one failure block others
    }
  }

  return NextResponse.json({
    processed,
    total: orders.length,
    timestamp: new Date().toISOString(),
  });
}

/** Health check — allows verifying the route is reachable without auth */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
