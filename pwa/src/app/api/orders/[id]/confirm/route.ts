import { NextResponse } from 'next/server';
import { verifyConfirmationToken } from '@/lib/auth';
import { capturePayment, createPayout } from '@/lib/yukassa';
import {
  getOrderById,
  updateOrder,
  insertEscrowLedger,
  getWorkerByTelegramId,
  getWorkerByPhone,
} from '@/lib/db';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    let body: { token?: unknown; role?: unknown };
    try {
      body = (await req.json()) as { token?: unknown; role?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { token, role } = body;

    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }
    if (role !== 'customer' && role !== 'supplier') {
      return NextResponse.json({ error: 'role must be customer or supplier' }, { status: 400 });
    }

    // Verify JWT confirmation token
    const payload = verifyConfirmationToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token' },
        { status: 401 }
      );
    }

    // Cross-check token matches request params
    if (payload.orderId !== id || payload.role !== role) {
      return NextResponse.json(
        { error: 'Token does not match this order/role' },
        { status: 401 }
      );
    }

    // Fetch order
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check escrow_status is confirmable
    const confirmableStatuses = ['payment_held', 'in_progress', 'pending_confirm'];
    if (!confirmableStatuses.includes(String(order.escrow_status ?? ''))) {
      return NextResponse.json(
        { error: 'Order is not in a confirmable state' },
        { status: 409 }
      );
    }

    // Idempotency check — double-confirm returns 200, not error
    if (role === 'customer' && order.customer_confirmed === true) {
      return NextResponse.json({ status: 'already_confirmed', role: 'customer' });
    }
    if (role === 'supplier' && order.supplier_confirmed === true) {
      return NextResponse.json({ status: 'already_confirmed', role: 'supplier' });
    }

    // Update the appropriate confirmation field
    if (role === 'customer') {
      await updateOrder(id, {
        customer_confirmed: true,
        customer_confirmed_at: new Date().toISOString(),
      });
    } else {
      await updateOrder(id, {
        supplier_confirmed: true,
        supplier_confirmed_at: new Date().toISOString(),
      });
    }

    // Re-fetch order to check if BOTH are now confirmed
    const updated = await getOrderById(id);
    const bothConfirmed =
      updated?.customer_confirmed === true && updated?.supplier_confirmed === true;

    if (bothConfirmed) {
      await updateOrder(id, { escrow_status: 'completed' });

      // Capture payment
      const paymentId = String(updated.yookassa_payment_id);
      const captureKey = `capture-${id}-${Date.now()}`;
      try {
        await capturePayment(paymentId, captureKey);
        await updateOrder(id, {
          payment_captured: true,
          payment_captured_at: new Date().toISOString(),
        });
        await insertEscrowLedger({
          order_id: id,
          type: 'capture',
          amount: Number(updated.customer_total) || 0,
          yookassa_operation_id: paymentId,
          note: 'Captured after both-party confirmation',
        });
      } catch (err) {
        console.error(`Capture failed for order ${id}:`, err);
        // Don't block — webhook will confirm capture when YooKassa processes it
      }

      // Payout routing based on payout_method
      const payoutMethod = (updated.payout_method as string) || 'manual_transfer';

      if (payoutMethod === 'yookassa_payout') {
        // ---- YooKassa auto-payout (existing logic, unchanged) ----
        const payoutAgentId = process.env.YUKASSA_PAYOUT_AGENT_ID;
        if (payoutAgentId && updated.executor_id) {
          try {
            const worker =
              (await getWorkerByTelegramId(String(updated.executor_id))) ||
              (await getWorkerByPhone(String(updated.executor_id)));

            if (worker?.payout_card_synonym) {
              const payoutResult = await createPayout({
                amount: Number(updated.supplier_payout) || 0,
                cardSynonym: String(worker.payout_card_synonym),
                orderId: id,
                workerPhone: String(worker.phone || ''),
                description: `Выплата за заказ ${id}`,
                idempotenceKey: `payout-${id}-${Date.now()}`,
              });

              await updateOrder(id, {
                payout_status_escrow: 'processing',
                payout_id: payoutResult.id,
              });

              await insertEscrowLedger({
                order_id: id,
                type: 'payout',
                amount: Number(updated.supplier_payout) || 0,
                yookassa_operation_id: payoutResult.id,
                note: 'Payout initiated to executor',
              });
            } else {
              console.warn(
                `No payout card synonym for executor ${String(updated.executor_id)}, payout deferred`
              );
              await updateOrder(id, { payout_status_escrow: 'pending' });
            }
          } catch (err) {
            console.error(`Payout failed for order ${id}:`, err);
            await updateOrder(id, { payout_status_escrow: 'failed' });
          }
        } else if (!payoutAgentId) {
          console.warn('YUKASSA_PAYOUT_AGENT_ID not configured, payout deferred');
          await updateOrder(id, { payout_status_escrow: 'pending' });
        }
      } else {
        // ---- manual_transfer or cash: n8n webhook + pending_manual ----
        const methodLabel = payoutMethod === 'cash' ? 'Наличные' : 'Перевод вручную';
        const worker =
          (await getWorkerByTelegramId(String(updated.executor_id || ''))) ||
          (await getWorkerByPhone(String(updated.executor_id || '')));

        // Fire-and-forget n8n webhook for MAX notification
        const webhookUrl = process.env.N8N_PAYOUT_WEBHOOK_URL;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: id,
              payout_method: payoutMethod,
              payout_amount: updated.supplier_payout,
              worker_name: worker?.name || 'Неизвестно',
              worker_phone: worker?.phone || 'Неизвестно',
              method_label: methodLabel,
            }),
          }).catch((err) => console.error('n8n payout webhook failed:', err));
        }

        await updateOrder(id, { payout_status_escrow: 'pending_manual' });
        await insertEscrowLedger({
          order_id: id,
          type: 'payout',
          amount: Number(updated.supplier_payout) || 0,
          note: `Manual payout scheduled: ${payoutMethod}`,
        });
      }
    } else {
      // Only one side confirmed so far — update status to pending_confirm
      await updateOrder(id, { escrow_status: 'pending_confirm' });
    }

    return NextResponse.json({
      status: 'confirmed',
      role,
      bothConfirmed,
      escrowStatus: bothConfirmed ? 'completed' : 'pending_confirm',
    });
  } catch (error) {
    console.error('POST /api/orders/[id]/confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
