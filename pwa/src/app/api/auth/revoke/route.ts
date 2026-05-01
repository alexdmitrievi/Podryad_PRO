import { NextRequest, NextResponse } from 'next/server';
import { revokeSessionToken } from '@/lib/auth';

/** Revoke a session token. Protected by admin PIN or service role. */
export async function POST(req: NextRequest) {
  // Auth: check admin PIN or service role
  const pin = req.headers.get('x-admin-pin') ?? '';
  const adminPin = process.env.ADMIN_PIN;
  if (adminPin && pin !== adminPin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const token = body.token;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const ok = await revokeSessionToken(token);
  if (!ok) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
