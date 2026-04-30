import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { enqueueJob } from '@/lib/job-queue';

/** Strip all non-digit characters from a phone string and return only digits. */
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

const SUCCESS_MESSAGE = 'Если номер зарегистрирован, ссылка будет отправлена';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { phone } = body as Record<string, unknown>;

  // Validate phone: require 10+ digits after stripping
  const digits = stripPhone(String(phone ?? ''));
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  // Rate limit by phone to prevent messenger spam: 3 per 10 min
  const rl = await checkRateLimit(`recover:${digits}`, 3, 10 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE }); // silent 200 — don't hint rate limit
  }

  // Look up customer_tokens by phone
  const db = getServiceClient();
  const { data: tokenRow } = await db
    .from('customer_tokens')
    .select('*')
    .eq('phone', digits)
    .single();

  // Always return success — don't leak whether phone is registered
  if (!tokenRow) {
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
  }

  void enqueueJob({
    queueName: 'customer',
    jobType: 'customer.send_dashboard_link',
    dedupeKey: `customer.send_dashboard_link:${digits}`,
    payload: {
      phone: digits,
      access_token: (tokenRow as Record<string, unknown>).access_token,
      preferred_contact: (tokenRow as Record<string, unknown>).preferred_contact,
      messenger_id: (tokenRow as Record<string, unknown>).messenger_id,
      action: 'recover',
    },
  }).catch((err) => {
    console.error('enqueueJob customer.send_dashboard_link error (non-blocking):', err);
  });

  return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
}
