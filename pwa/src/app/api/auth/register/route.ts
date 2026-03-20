import { NextRequest, NextResponse } from 'next/server';
import { signPodryadSession } from '@/lib/auth';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `7${d}`;
  if (d.length === 11 && d.startsWith('8')) return `7${d.slice(1)}`;
  if (d.length === 11 && d.startsWith('7')) return d;
  return d;
}

export async function POST(req: NextRequest) {
  let body: {
    role?: string;
    phone?: string;
    name?: string;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const roleIn = body.role;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (roleIn !== 'customer' && roleIn !== 'worker') {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }
  if (phone.length < 10 || normalizePhone(phone).length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 400 });
  }

  const userId = `reg:${normalizePhone(phone)}`;

  try {
    const token = signPodryadSession({
      user_id: userId,
      role: roleIn,
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
  } catch {
    return NextResponse.json({ error: 'server_config' }, { status: 500 });
  }
}
