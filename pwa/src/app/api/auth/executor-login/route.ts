import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/customerAuth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`executor-login:${clientIp}`, 5, 15 * 60 * 1000);
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

    // Look up user with role='worker'
    const { data: user } = await db
      .from('users')
      .select('phone, name, password_hash, role')
      .eq('phone', rawPhone)
      .eq('role', 'worker')
      .single();

    // Constant-time-safe verification
    const dummyHash = '$2b$12$dummyhashfortimingsafetyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const hashToCheck = user?.password_hash ?? dummyHash;
    const valid = await verifyPassword(String(password), hashToCheck);

    if (!user || !valid) {
      return NextResponse.json({ error: 'Неверный телефон или пароль' }, { status: 401 });
    }

    // Get worker profile for extra info
    const { data: worker } = await db
      .from('workers')
      .select('telegram_id, name, phone, city, rating, jobs_count')
      .eq('user_phone', rawPhone)
      .maybeSingle();

    await resetRateLimit(`executor-login:${clientIp}`);

    const token = await createSessionToken({
      sub: rawPhone,
      phone: rawPhone,
      name: user.name || worker?.name || '',
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      executor: {
        phone: rawPhone,
        name: user.name || worker?.name || '',
        telegram_id: worker?.telegram_id ?? null,
        city: worker?.city ?? '',
        rating: worker?.rating ?? null,
        jobs_count: worker?.jobs_count ?? 0,
      },
    });
  } catch (err) {
    log.error('Executor login error', { error: String(err) });
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
