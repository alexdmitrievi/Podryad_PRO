import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/customerAuth';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`executor-register:${clientIp}`, 5, 15 * 60 * 1000);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Повторите через 15 минут.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await req.json();
    const { phone, name, password } = body;

    if (!phone || !name || !password) {
      return NextResponse.json({ error: 'Телефон, имя и пароль обязательны' }, { status: 400 });
    }
    const pwd = String(password);
    if (pwd.length < 8) {
      return NextResponse.json({ error: 'Пароль минимум 8 символов' }, { status: 400 });
    }
    if (!/[A-ZА-Я]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return NextResponse.json({ error: 'Пароль должен содержать заглавную букву и цифру' }, { status: 400 });
    }

    const rawPhone = String(phone).replace(/\D/g, '').replace(/^8/, '7');
    if (rawPhone.length < 10) {
      return NextResponse.json({ error: 'Некорректный номер телефона' }, { status: 400 });
    }

    const rawName = String(name).trim();
    if (rawName.length > 100) {
      return NextResponse.json({ error: 'Имя слишком длинное' }, { status: 400 });
    }

    const db = getServiceClient();

    // Check if phone already registered as executor
    const { data: existing } = await db
      .from('users')
      .select('phone')
      .eq('phone', rawPhone)
      .eq('role', 'worker')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Этот номер уже зарегистрирован как исполнитель' }, { status: 409 });
    }

    const password_hash = await hashPassword(pwd);

    // Create user entry
    const { error: userErr } = await db
      .from('users')
      .insert({
        phone: rawPhone,
        name: rawName,
        password_hash,
        role: 'worker',
        entity_type: 'person',
      });

    if (userErr) {
      log.error('Executor register: users insert', { error: String(userErr) });
      return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 });
    }

    // Create worker profile
    const telegram_id = `pwa:${rawPhone}`;
    const { error: workerErr } = await db
      .from('workers')
      .insert({
        telegram_id,
        name: rawName,
        phone: rawPhone,
        user_phone: rawPhone,
      });

    if (workerErr) {
      log.error('Executor register: workers insert', { error: String(workerErr) });
      // Don't fail — worker profile is non-critical, user entry is enough
    }

    const token = await createSessionToken({
      sub: rawPhone,
      phone: rawPhone,
      name: rawName,
      role: 'worker',
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      executor: {
        phone: rawPhone,
        name: rawName,
      },
    }, { status: 201 });
  } catch (err) {
    log.error('Executor register error', { error: String(err) });
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
