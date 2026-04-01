import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { updateOrder, insertEscrowLedger } from '@/lib/db';

interface YooKassaPaymentObject {
  id: string;
  status: string;
  amount?: { value: string; currency: string };
  metadata?: Record<string, string>;
  paid?: boolean;
  created_at?: string;
}

interface YooKassaEvent {
  type: string;
  event: string;
  object: YooKassaPaymentObject;
}

// ── IP VERIFICATION ──

const YOOKASSA_CIDRS = [
  { ip: 0xB9474C00, mask: 0xFFFFFFE0 }, // 185.71.76.0/27
  { ip: 0xB9474D00, mask: 0xFFFFFFE0 }, // 185.71.77.0/27
  { ip: 0x4D4B9900, mask: 0xFFFFFF80 }, // 77.75.153.0/25
  { ip: 0x4D4B9A80, mask: 0xFFFFFF80 }, // 77.75.154.128/25
  { ip: 0x4D4B9C0B, mask: 0xFFFFFFFF }, // 77.75.156.11/32
  { ip: 0x4D4B9C23, mask: 0xFFFFFFFF }, // 77.75.156.35/32
];

function parseIPv4(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isYooKassaIP(ipStr: string): boolean {
  if (process.env.NODE_ENV === 'development') return true; // skip in dev
  try {
    const ip = parseIPv4(ipStr);
    return YOOKASSA_CIDRS.some(c => (ip & c.mask) === (c.ip & c.mask));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // IP verification — YooKassa does not use HMAC, verify by IP whitelist
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded?.split(',')[0]?.trim() || '';
    if (!isYooKassaIP(clientIp)) {
      console.warn(`YooKassa callback: rejected IP ${clientIp}`);
      return NextResponse.json({ status: 'ok' }); // return 200 to not trigger retries
    }

    const body = (await req.json()) as YooKassaEvent;

    if (body.event === 'payment.succeeded') {
      const payment = body.object;
      const orderId = payment.metadata?.order_id;

      if (!orderId) {
        console.warn('YooKassa callback: отсутствует order_id в metadata');
        return NextResponse.json({ status: 'ok' });
      }

      // Check if this is an escrow payment that was captured
      if (payment.metadata?.type === 'escrow') {
        await updateOrder(orderId, {
          escrow_status: 'completed',
          payment_captured: true,
          payment_captured_at: new Date().toISOString(),
        });

        const amountValue = payment.amount?.value ? parseFloat(payment.amount.value) : 0;
        await insertEscrowLedger({
          order_id: orderId,
          type: 'capture',
          amount: amountValue,
          yookassa_operation_id: payment.id,
          note: 'Payment captured after confirmation',
        });

        console.log(`Escrow capture confirmed: order=${orderId}`);
        return NextResponse.json({ status: 'ok' });
      }

      // Non-escrow payment: existing behavior preserved
      const db = getServiceClient();

      // Обновляем статус заказа pending → paid
      const { error: updateError } = await db
        .from('orders')
        .update({ status: 'paid' })
        .eq('order_id', orderId)
        .eq('status', 'pending');

      if (updateError) {
        console.error('Ошибка обновления заказа:', updateError);
      }

      // Создаём запись в таблице payments
      const amountValue = payment.amount?.value
        ? parseFloat(payment.amount.value)
        : 0;

      const { error: paymentError } = await db.from('payments').insert({
        order_id: orderId,
        payment_id: payment.id,
        amount: amountValue,
        currency: payment.amount?.currency || 'RUB',
        status: 'succeeded',
        provider: 'yookassa',
        created_at: payment.created_at || new Date().toISOString(),
      });

      if (paymentError) {
        console.error('Ошибка создания записи платежа:', paymentError);
      }
    }

    if (body.event === 'payment.waiting_for_capture') {
      const payment = body.object;
      const metadata = payment.metadata || {};

      // Only process escrow payments (ignore non-escrow payments like VIP/rental)
      if (metadata.type === 'escrow' && metadata.order_id) {
        const orderId = metadata.order_id;
        const amount = payment.amount?.value ? parseFloat(payment.amount.value) : 0;

        // Update order escrow status
        await updateOrder(orderId, {
          escrow_status: 'payment_held',
          yookassa_payment_id: payment.id,
          payment_held_at: new Date().toISOString(),
        });

        // Record in escrow ledger
        await insertEscrowLedger({
          order_id: orderId,
          type: 'hold',
          amount,
          yookassa_operation_id: payment.id,
          note: 'Payment held by YooKassa',
        });

        console.log(`Escrow hold recorded: order=${orderId} payment=${payment.id} amount=${amount}`);
      }
    }

    if (body.event === 'payment.canceled') {
      const payment = body.object;
      const metadata = payment.metadata || {};

      if (metadata.type === 'escrow' && metadata.order_id) {
        await updateOrder(metadata.order_id, {
          escrow_status: 'cancelled',
        });

        const amount = payment.amount?.value ? parseFloat(payment.amount.value) : 0;
        await insertEscrowLedger({
          order_id: metadata.order_id,
          type: 'release',
          amount,
          yookassa_operation_id: payment.id,
          note: 'Payment cancelled/expired',
        });
      }
    }

    // YooKassa ожидает 200 OK на все уведомления
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('POST /api/payments/callback error:', error);
    // Всегда возвращаем 200, чтобы YooKassa не повторяла запрос бесконечно
    return NextResponse.json({ status: 'ok' });
  }
}
