import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

/** Strip all non-digit characters from a phone string and return only digits. */
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

const SUCCESS_MESSAGE = 'Если номер зарегистрирован, ссылка будет отправлена';

// Rate limit: max 3 recover attempts per phone per 10 min
const recoverAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = recoverAttempts.get(phone);
  if (!entry || now > entry.resetAt) {
    recoverAttempts.set(phone, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

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

  // Rate limit by phone to prevent messenger spam
  if (isRateLimited(digits)) {
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

  // Fire-and-forget webhook to n8n (never blocks response)
  const webhookUrl = process.env.N8N_SEND_DASHBOARD_LINK_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: digits,
        access_token: (tokenRow as Record<string, unknown>).access_token,
        preferred_contact: (tokenRow as Record<string, unknown>).preferred_contact,
        messenger_id: (tokenRow as Record<string, unknown>).messenger_id,
        action: 'recover',
      }),
    }).catch((err) => {
      console.error('n8n recover webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
}
