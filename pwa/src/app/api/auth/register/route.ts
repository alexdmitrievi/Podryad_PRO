import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signPodryadSession, normalizePhone } from '@/lib/auth';
import { createUser, findUserByPhone, findUserByEmail, createWorkerProfile } from '@/lib/db';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: {
    role?: string;
    phone?: string;
    email?: string;
    name?: string;
    password?: string;
    entity_type?: string;
    company_name?: string;
    inn?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const roleIn = body.role;
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const VALID_ENTITY_TYPES = ['person', 'selfemployed', 'ip', 'company'];
  const entityType = body.entity_type && VALID_ENTITY_TYPES.includes(body.entity_type)
    ? body.entity_type
    : 'person';
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : '';
  const inn = typeof body.inn === 'string' ? body.inn.trim() : '';

  if (roleIn !== 'customer' && roleIn !== 'worker') {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  // Phone is required (PK of users table), email is optional
  const hasPhone = phoneRaw.length >= 10;
  const hasEmail = EMAIL_RE.test(emailRaw);
  if (!hasPhone) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }
  if (emailRaw && !hasEmail) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 400 });
  }

  const normalized = normalizePhone(phoneRaw);
  const userId = `reg:${normalized}`;

  try {
    // Check duplicates
    if (normalized) {
      const existing = await findUserByPhone(normalized);
      if (existing) {
        return NextResponse.json({ error: 'user_exists' }, { status: 409 });
      }
    }
    if (hasEmail) {
      const existing = await findUserByEmail(emailRaw);
      if (existing) {
        return NextResponse.json({ error: 'user_exists' }, { status: 409 });
      }
    }

    const password_hash = hashPassword(password);
    await createUser({
      phone: normalized,
      email: hasEmail ? emailRaw : undefined,
      name,
      password_hash,
      role: roleIn,
      entity_type: entityType,
      company_name: companyName || undefined,
      inn: inn || undefined,
    });

    // Create worker profile for workers
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
