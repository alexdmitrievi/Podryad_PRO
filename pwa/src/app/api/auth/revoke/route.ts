import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { revokeSessionToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

/** Revoke a session token. Protected by admin PIN with rate limiting. */
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const rl = await checkRateLimit(`revoke:${clientIp}`, 5, 15 * 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const pin = req.headers.get('x-admin-pin') ?? '';
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const pinBuf = Buffer.from(pin);
  const adminBuf = Buffer.from(adminPin);
  if (pinBuf.length !== adminBuf.length || !timingSafeEqual(pinBuf, adminBuf)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { token?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const token = body.token;
  if (!token || typeof token !== 'string') return NextResponse.json({ error: 'token is required' }, { status: 400 });

  const ok = await revokeSessionToken(token);
  if (!ok) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
