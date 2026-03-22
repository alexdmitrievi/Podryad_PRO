import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as YooKassaEvent;

    if (body.event === 'payment.succeeded') {
      const payment = body.object;
      const orderId = payment.metadata?.order_id;

      if (!orderId) {
        console.warn('YooKassa callback: отсутствует order_id в metadata');
        return NextResponse.json({ status: 'ok' });
      }

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

    // YooKassa ожидает 200 OK на все уведомления
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('POST /api/payments/callback error:', error);
    // Всегда возвращаем 200, чтобы YooKassa не повторяла запрос бесконечно
    return NextResponse.json({ status: 'ok' });
  }
}
