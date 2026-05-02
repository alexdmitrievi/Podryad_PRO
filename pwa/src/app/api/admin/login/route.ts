import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyPassword } from '@/lib/customerAuth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { writeAuditLog } from '@/lib/audit';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { log } from '@/lib/logger';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-admin-secret'
);
const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours for admin sessions

async function setAdminCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ua = req.headers.get('user-agent') ?? undefined;

    const rl = await checkRateLimit(`admin-login:${clientIp}`, 5, 15 * 60 * 1000);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Повторите через 15 минут.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Логин и пароль обязательны' }, { status: 400 });
    }

    const db = getServiceClient();

    // Try admin_users table first
    const { data: adminUser } = await db
      .from('admin_users')
      .select('id, username, pin_hash, role, is_active')
      .eq('username', String(username).trim().toLowerCase())
      .maybeSingle();

    // Constant-time safe verification
    const dummyHash = '$2b$12$dummyhashfortimingsafetyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const hashToCheck = adminUser?.pin_hash ?? dummyHash;
    const valid = await verifyPassword(String(password), hashToCheck);

    if (adminUser && adminUser.is_active && valid) {
      await resetRateLimit(`admin-login:${clientIp}`);

      // Update last_login
      await db.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', adminUser.id);

      // Create JWT session
      const token = await new SignJWT({
        admin_id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(adminUser.id)
        .setIssuedAt()
        .setExpirationTime('12h')
        .sign(ADMIN_JWT_SECRET);

      await setAdminCookie(token);

      void writeAuditLog({
        admin_id: adminUser.id,
        admin_username: adminUser.username,
        action: 'POST /api/admin/login',
        endpoint: '/api/admin/login',
        ip_address: clientIp,
        user_agent: ua,
        details: { success: true, method: 'admin_users' },
      });

      return NextResponse.json({
        ok: true,
        admin: { id: adminUser.id, username: adminUser.username, role: adminUser.role },
      });
    }

    // Fallback: legacy PIN verification
    const pin = String(password);
    const adminPin = process.env.ADMIN_PIN;

    if (adminPin && String(username).trim().toLowerCase() === 'admin' && pin === adminPin) {
      await resetRateLimit(`admin-login:${clientIp}`);

      const token = await new SignJWT({
        admin_id: 'pin',
        username: 'admin',
        role: 'admin',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('pin')
        .setIssuedAt()
        .setExpirationTime('12h')
        .sign(ADMIN_JWT_SECRET);

      await setAdminCookie(token);

      void writeAuditLog({
        admin_id: 'pin',
        admin_username: 'admin',
        action: 'POST /api/admin/login',
        endpoint: '/api/admin/login',
        ip_address: clientIp,
        user_agent: ua,
        details: { success: true, method: 'legacy_pin' },
      });

      return NextResponse.json({
        ok: true,
        admin: { id: 'pin', username: 'admin', role: 'admin' },
      });
    }

    void writeAuditLog({
      action: 'POST /api/admin/login (failed)',
      endpoint: '/api/admin/login',
      ip_address: clientIp,
      user_agent: ua,
      details: { success: false, username: String(username).trim() },
    });

    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  } catch (err) {
    log.error('Admin login error', { error: String(err) });
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
