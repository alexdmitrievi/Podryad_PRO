import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signPodryadSession, normalizePhone } from '@/lib/auth';
import { createUser, findUserByPhone, createWorkerProfile } from '@/lib/db';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

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

  const normalized = normalizePhone(phone);
  const userId = `reg:${normalized}`;

  try {
    const existing = await findUserByPhone(normalized);
    if (existing) {
      return NextResponse.json({ error: 'user_exists' }, { status: 409 });
    }

    const password_hash = hashPassword(password);
    await createUser({
      phone: normalized,
      name,
      password_hash,
      role: roleIn,
    });

    // Для воркеров — создаём профиль в workers (white_list=false, ожидает модерации)
    if (roleIn === 'worker') {
      try {
        await createWorkerProfile({
          telegram_id: `pwa:${normalized}`,
          name,
          phone: normalized,
          user_phone: normalized,
        });
      } catch (e) {
        console.error('Worker profile creation (non-critical):', e);
      }
    }

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
  } catch (e) {
    console.error('POST /api/auth/register:', e);
    return NextResponse.json({ error: 'server_config' }, { status: 500 });
  }
}
