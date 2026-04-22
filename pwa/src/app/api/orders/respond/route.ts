import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

interface ResponseBody {
  order_id: string;
  name: string;
  phone: string;
  comment?: string;
  price?: number;
}

/**
 * Executor response API — executors submit their bid/response to an order.
 * Responses go to admin for review, NOT to the customer.
 */
export async function POST(req: NextRequest) {
  let body: ResponseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { order_id, name, phone, comment, price } = body;

  if (!order_id || !name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  const db = getServiceClient();

  const { error } = await db.from('executor_responses').insert({
    order_id,
    name: name.trim(),
    phone: digits,
    comment: comment?.trim() || null,
    price: price ?? null,
    status: 'pending',
  });

  if (error) {
    console.error('POST /api/orders/respond:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Fire-and-forget n8n webhook for admin notification
  // Uses dedicated executor-response webhook; falls back to leads webhook so
  // at least one notification always fires.
  const webhookUrl =
    process.env.N8N_EXECUTOR_RESPONSE_WEBHOOK_URL || process.env.N8N_LEADS_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'executor_response',
        order_id,
        name: name.trim(),
        phone: digits,
        comment: comment?.trim(),
        price,
      }),
    }).catch((err) => {
      console.error('n8n executor response webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
