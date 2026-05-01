import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

/**
 * POST /api/payment/callback
 *
 * Receives payment status webhooks from the configured payment gateway
 * (Tinkoff / YooKassa / CloudPayments).
 *
 * On confirmed payment:
 *   1. Validates gateway signature
 *   2. Updates order: payment_status = 'paid', status = 'paid',
 *      payment_confirmed_at = now()
 *   3. Enqueues notify.payment_held job
 *
 * Returns 200 OK regardless of business logic errors (prevents gateway retries
 * on already-processed webhooks). Only returns non-200 on malformed requests
 * or signature failures.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Signature verification helpers
// ─────────────────────────────────────────────────────────────────────────────

function verifyTinkoff(body: Record<string, unknown>, password: string): boolean {
  // Tinkoff concatenates sorted key=value pairs and hashes with SHA-256
  const token = body['Token'] as string | undefined;
  if (!token) return false;

  const filtered = Object.entries(body)
    .filter(([k]) => k !== 'Token' && k !== 'Receipt' && k !== 'DATA')
    .sort(([a], [b]) => a.localeCompare(b));

  const str = filtered.map(([, v]) => String(v)).join('') + password;
  // We include password at the end (Tinkoff spec: sorted values + password)
  const strWithPass = filtered.map(([, v]) => String(v)).join('') + password;
  const hash = createHmac('sha256', '').update(strWithPass).digest('hex');
  const tokenBuf = Buffer.from(token);
  const hashBuf = Buffer.from(hash);
  return tokenBuf.length === hashBuf.length && timingSafeEqual(tokenBuf, hashBuf);
}

function verifyYooKassa(rawBody: string, signatureHeader: string, webhookSecret: string): boolean {
  // YooKassa uses HMAC-SHA256 on the raw body
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const headerBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  return headerBuf.length === expectedBuf.length && timingSafeEqual(headerBuf, expectedBuf);
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalise webhook to a canonical shape
// ─────────────────────────────────────────────────────────────────────────────

interface NormalisedEvent {
  gateway_order_id: string; // provider's payment ID
  order_id: string | null;  // our order_id (may come from metadata)
  confirmed: boolean;       // true if payment succeeded
  amount: number;           // in RUB
}

function normaliseTinkoff(body: Record<string, unknown>): NormalisedEvent {
  return {
    gateway_order_id: String(body['PaymentId'] ?? ''),
    order_id: String(body['OrderId'] ?? ''),
    confirmed: body['Status'] === 'CONFIRMED' || body['Status'] === 'AUTHORIZED',
    amount: Number(body['Amount'] ?? 0) / 100, // kopeks → rubles
  };
}

function normaliseYooKassa(body: Record<string, unknown>): NormalisedEvent {
  const obj = body['object'] as Record<string, unknown> | undefined ?? {};
  const meta = obj['metadata'] as Record<string, unknown> | undefined ?? {};
  const amount = (obj['amount'] as { value?: string } | undefined)?.value;
  return {
    gateway_order_id: String(obj['id'] ?? ''),
    order_id: String(meta['order_id'] ?? ''),
    confirmed: (body['event'] as string | undefined)?.startsWith('payment.succeeded') ?? false,
    amount: amount ? parseFloat(amount) : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let bodyParsed: Record<string, unknown>;
  try {
    bodyParsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const gateway = process.env.PAYMENT_GATEWAY ?? 'manual';
  let event: NormalisedEvent | null = null;

  // ── Tinkoff ──────────────────────────────────────────────────────────────
  if (gateway === 'tinkoff') {
    const password = process.env.TINKOFF_PASSWORD;
    if (!password) {
      log.error('TINKOFF_PASSWORD not configured');
      return NextResponse.json({ error: 'Gateway misconfigured' }, { status: 500 });
    }
    if (!verifyTinkoff(bodyParsed, password)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    event = normaliseTinkoff(bodyParsed);
  }

  // ── YooKassa ─────────────────────────────────────────────────────────────
  else if (gateway === 'yookassa') {
    const secret = process.env.YOOKASSA_WEBHOOK_SECRET;
    const sig = req.headers.get('x-b3-traceid') ?? req.headers.get('signature') ?? '';
    if (secret && sig && !verifyYooKassa(rawBody, sig, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    event = normaliseYooKassa(bodyParsed);
  }

  // ── Manual / Unknown ─────────────────────────────────────────────────────
  else {
    // Accept calls from admin tools with PAYMENT_API_SECRET
    const apiSecret = process.env.PAYMENT_API_SECRET;
    const provided = req.headers.get('x-payment-secret') ?? '';
    if (apiSecret) {
      const a = Buffer.from(provided);
      const b = Buffer.from(apiSecret);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const orderId = String(bodyParsed['order_id'] ?? '');
    event = {
      gateway_order_id: `manual-${orderId}`,
      order_id: orderId,
      confirmed: true,
      amount: Number(bodyParsed['amount'] ?? 0),
    };
  }

  if (!event?.confirmed) {
    // Non-confirmed events (e.g. payment.waiting_for_capture) — acknowledge but skip
    return NextResponse.json({ ok: true, skipped: true });
  }

  const db = getServiceClient();

  // Look up order by our order_id or by gateway_order_id
  let orderId = event.order_id;
  if (!orderId) {
    const { data: found } = await db
      .from('orders')
      .select('order_id, customer_name, customer_phone, work_type, customer_total')
      .eq('payment_gateway_order_id', event.gateway_order_id)
      .maybeSingle();
    if (found) orderId = found.order_id;
  }

  if (!orderId) {
    log.error('payment/callback: could not resolve order_id', { event: String(JSON.stringify(event)) });
    return NextResponse.json({ ok: true, skipped: true, reason: 'order_not_found' });
  }

  // Fetch order details for the notification
  const { data: order } = await db
    .from('orders')
    .select('order_id, payment_status, customer_name, customer_phone, work_type, customer_total, supplier_payout')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!order) {
    log.error('payment/callback: order row missing', { orderId });
    return NextResponse.json({ ok: true, skipped: true, reason: 'order_row_missing' });
  }

  // Idempotent: skip if already confirmed
  if (order.payment_status === 'paid') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_paid' });
  }

  const now = new Date().toISOString();

  // Update order to paid
  const { error: updateErr } = await db
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'paid',
      payment_paid_at: now,
      payment_confirmed_at: now,
    })
    .eq('order_id', orderId);

  if (updateErr) {
    log.error('payment/callback update error', { error: String(updateErr) });
    // Return 500 so gateway retries (webhook has not been processed)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  // Enqueue admin notification
  await enqueueJob({
    queueName: 'default',
    jobType: 'notify.payment_held',
    payload: {
      order_id: orderId,
      customer_name: order.customer_name ?? '',
      customer_phone: order.customer_phone ?? '',
      work_type: order.work_type ?? '',
      amount: event.amount || order.customer_total,
      paid_at: now,
    },
    dedupeKey: `payment_confirmed:${orderId}`,
    sourceTable: 'orders',
    sourceId: orderId,
    createdBy: 'api/payment/callback',
  });

  return NextResponse.json({ ok: true, order_id: orderId });
}
