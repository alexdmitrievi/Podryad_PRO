import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

/**
 * POST /api/payment/create
 *
 * Initiates a payment session for an order.
 * Currently returns a scaffold URL — wire to a real gateway by implementing
 * `createGatewaySession()` below.
 *
 * Protected by PAYMENT_API_SECRET (shared between this service and the
 * front-end / admin panel that initiates payment).
 *
 * Request body:
 * {
 *   order_id: string,
 *   amount: number,       // in RUB, e.g. 15000
 *   description?: string,
 *   return_url?: string,  // redirect after payment
 * }
 *
 * Success response:
 * { ok: true, payment_url: string, gateway_order_id: string }
 *
 * Error response:
 * { error: string }
 */

function verifySecret(secret: string): boolean {
  const expected = process.env.PAYMENT_API_SECRET;
  if (!expected) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gateway adapter — replace this function body to wire a real provider.
// Must return { payment_url, gateway_order_id }.
// ─────────────────────────────────────────────────────────────────────────────
async function createGatewaySession(params: {
  orderId: string;
  amount: number;
  description: string;
  returnUrl: string;
}): Promise<{ payment_url: string; gateway_order_id: string }> {
  const gateway = process.env.PAYMENT_GATEWAY; // 'tinkoff' | 'yookassa' | 'cloudpayments'

  // ── Tinkoff ──────────────────────────────────────────────────────────────
  if (gateway === 'tinkoff') {
    const terminalKey = process.env.TINKOFF_TERMINAL_KEY;
    const password = process.env.TINKOFF_PASSWORD;
    if (!terminalKey || !password) {
      throw new Error('TINKOFF_TERMINAL_KEY or TINKOFF_PASSWORD not configured');
    }
    // Tinkoff Init call (https://www.tinkoff.ru/kassa/develop/api/payments/init-request/)
    const res = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TerminalKey: terminalKey,
        Amount: Math.round(params.amount * 100), // kopeks
        OrderId: params.orderId,
        Description: params.description.slice(0, 140),
        SuccessURL: params.returnUrl,
        FailURL: params.returnUrl,
        NotificationURL: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/payment/callback`,
      }),
    });
    const data = (await res.json()) as { Success?: boolean; PaymentURL?: string; PaymentId?: string; Message?: string };
    if (!data.Success || !data.PaymentURL || !data.PaymentId) {
      throw new Error(`Tinkoff Init failed: ${data.Message ?? 'unknown error'}`);
    }
    return { payment_url: data.PaymentURL, gateway_order_id: data.PaymentId };
  }

  // ── YooKassa ─────────────────────────────────────────────────────────────
  if (gateway === 'yookassa') {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
      throw new Error('YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY not configured');
    }
    const idempotenceKey = `${params.orderId}-${Date.now()}`;
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: { value: params.amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: params.returnUrl },
        description: params.description.slice(0, 128),
        capture: true,
        metadata: { order_id: params.orderId },
      }),
    });
    const data = (await res.json()) as { id?: string; confirmation?: { confirmation_url?: string }; error?: { description?: string } };
    if (!data.id || !data.confirmation?.confirmation_url) {
      throw new Error(`YooKassa create failed: ${data.error?.description ?? 'unknown error'}`);
    }
    return { payment_url: data.confirmation.confirmation_url, gateway_order_id: data.id };
  }

  // ── Fallback: manual / not configured — return dashboard link ─────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return {
    payment_url: `${appUrl}/my`,
    gateway_order_id: `manual-${params.orderId}`,
  };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-payment-secret') ?? '';
  if (!verifySecret(secret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { order_id: string; amount: number; description?: string; return_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { order_id, amount, description, return_url } = body;
  if (!order_id || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'order_id and positive amount are required' }, { status: 400 });
  }

  const db = getServiceClient();

  // Verify order exists and is in a payable state
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('order_id, payment_status, customer_total, display_price, customer_name, customer_phone')
    .eq('order_id', order_id)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!['pending', 'invoice_sent'].includes(order.payment_status ?? '')) {
    return NextResponse.json({ error: `Order payment_status is '${order.payment_status}', expected pending or invoice_sent` }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const finalReturnUrl = return_url || `${appUrl}/my`;
  const finalDesc = description || `Заказ Подряд PRO #${order_id.slice(0, 8)} — ${amount.toLocaleString('ru-RU')} ₽`;

  try {
    const { payment_url, gateway_order_id } = await createGatewaySession({
      orderId: order_id,
      amount,
      description: finalDesc,
      returnUrl: finalReturnUrl,
    });

    // Persist gateway data on the order
    const gateway = process.env.PAYMENT_GATEWAY ?? 'manual';
    await db
      .from('orders')
      .update({
        payment_status: 'invoice_sent',
        payment_gateway: gateway,
        payment_gateway_order_id: gateway_order_id,
        payment_gateway_url: payment_url,
        payment_sent_at: new Date().toISOString(),
      })
      .eq('order_id', order_id);

    // Enqueue dashboard-link job so customer receives the payment URL via messenger
    await enqueueJob({
      queueName: 'default',
      jobType: 'customer.send_payment_link',
      payload: {
        order_id,
        phone: order.customer_phone ?? '',
        payment_url,
        display_price: amount,
      },
      dedupeKey: `payment_link:${order_id}`,
      sourceTable: 'orders',
      sourceId: order_id,
      createdBy: 'api/payment/create',
    });

    return NextResponse.json({ ok: true, payment_url, gateway_order_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('POST /api/payment/create error', { error: String(message) });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
