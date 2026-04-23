import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/customerAuth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`login:${clientIp}`, 5, 15 * 60 * 1000);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Повторите через 15 минут.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'Введите телефон и пароль' }, { status: 400 });
    }

    const rawPhone = String(phone).replace(/\D/g, '').replace(/^8/, '7');
    const db = getServiceClient();

    const { data: customer } = await db
      .from('customers')
      .select('id, phone, name, password_hash')
      .eq('phone', rawPhone)
      .single();

    // Constant-time-safe: always run verifyPassword, even if not found
    const dummyHash = '$2b$12$dummyhashfortimingsafetyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const hashToCheck = customer?.password_hash ?? dummyHash;
    const valid = await verifyPassword(String(password), hashToCheck);

    if (!customer || !valid) {
      return NextResponse.json({ error: 'Неверный телефон или пароль' }, { status: 401 });
    }

    // Successful login — reset rate limit
    await resetRateLimit(`login:${clientIp}`);

    const token = await createSessionToken({ sub: customer.id, phone: customer.phone, name: customer.name });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, customer: { id: customer.id, name: customer.name } });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
