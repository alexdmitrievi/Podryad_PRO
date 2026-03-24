import { NextRequest, NextResponse } from 'next/server';
import { signPodryadSession, verifyPassword, normalizePhone } from '@/lib/auth';
import { findUserByPhone, findUserByEmail, updateUserLastLogin } from '@/lib/db';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { login?: string; phone?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Accept "login" field (new) or "phone" field (legacy)
  const loginRaw = typeof body.login === 'string' ? body.login.trim() : (typeof body.phone === 'string' ? body.phone.trim() : '');
  const password = typeof body.password === 'string' ? body.password : '';

  if (!loginRaw) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
  }
  if (password.length < 1) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 400 });
  }

  try {
    let user = null;
    let identifier = '';

    // Determine if input is email or phone
    if (EMAIL_RE.test(loginRaw)) {
      user = await findUserByEmail(loginRaw);
      identifier = loginRaw.toLowerCase();
    } else {
      const normalized = normalizePhone(loginRaw);
      if (normalized.length < 10) {
        return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
      }
      user = await findUserByPhone(normalized);
      identifier = normalized;
    }

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

    // Update last login using phone if available
    if (user.phone) {
      await updateUserLastLogin(user.phone);
    }

    const userId = user.phone ? `reg:${user.phone}` : `reg:${identifier}`;

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
