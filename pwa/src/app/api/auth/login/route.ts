import { NextRequest, NextResponse } from 'next/server';
import { signPodryadSession, verifyPassword } from '@/lib/auth';
import { findUserByPhone, updateUserLastLogin } from '@/lib/db';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `7${d}`;
  if (d.length === 11 && d.startsWith('8')) return `7${d.slice(1)}`;
  if (d.length === 11 && d.startsWith('7')) return d;
  return d;
}

export async function POST(req: NextRequest) {
  let body: { phone?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (phoneRaw.length < 10 || normalizePhone(phoneRaw).length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }
  if (password.length < 1) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 400 });
  }

  const normalized = normalizePhone(phoneRaw);
  const userId = `reg:${normalized}`;

  try {
    const user = await findUserByPhone(normalized);
    if (!user) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }
    if (user.is_active === false) {
      return NextResponse.json({ error: 'account_disabled' }, { status: 403 });
    }

    const hash = user.password_hash as string;
    if (!verifyPassword(password, hash)) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const role = user.role;
    if (role !== 'customer' && role !== 'worker') {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    await updateUserLastLogin(normalized);

    const token = signPodryadSession({
      user_id: userId,
      role,
      maxAgeSec: COOKIE_MAX_AGE,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('podryad_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('POST /api/auth/login:', e);
    return NextResponse.json({ error: 'server_config' }, { status: 500 });
  }
}
