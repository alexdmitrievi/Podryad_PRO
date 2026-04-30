import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { enqueueJob } from '@/lib/job-queue';

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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = await checkRateLimit(`respond:${ip}`, 15, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

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

  void enqueueJob({
    queueName: 'notifications',
    jobType: 'notify.executor_response_received',
    dedupeKey: `notify.executor_response_received:${order_id}:${digits}`,
    payload: {
      type: 'executor_response',
      order_id,
      name: name.trim(),
      phone: digits,
      comment: comment?.trim(),
      price,
    },
  }).catch((err) => {
    console.error('enqueueJob notify.executor_response_received error (non-blocking):', err);
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
