import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/customerAuth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`register:${clientIp}`, 5, 15 * 60 * 1000);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Повторите через 15 минут.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await req.json();
    const { phone, name, password, customer_type, org_name, inn, city, preferred_contact } = body;

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
    if (String(name).trim().length > 100) {
      return NextResponse.json({ error: 'Имя слишком длинное' }, { status: 400 });
    }
    const rawPhone = String(phone).replace(/\D/g, '').replace(/^8/, '7');
    if (rawPhone.length < 10) {
      return NextResponse.json({ error: 'Некорректный номер телефона' }, { status: 400 });
    }
    if (customer_type === 'business' && !org_name) {
      return NextResponse.json({ error: 'Укажите название организации' }, { status: 400 });
    }

    const db = getServiceClient();

    // Check if phone already registered
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('phone', rawPhone)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Этот номер уже зарегистрирован' }, { status: 409 });
    }

    const password_hash = await hashPassword(String(password));

    const { data: customer, error } = await db
      .from('customers')
      .insert({
        phone: rawPhone,
        name: String(name).trim(),
        password_hash,
        customer_type: customer_type || 'personal',
        org_name: org_name ? String(org_name).trim() : null,
        inn: inn ? String(inn).trim() : null,
        city: city || null,
        preferred_contact: preferred_contact || 'MAX',
      })
      .select('id, phone, name, customer_type')
      .single();

    if (error || !customer) {
      console.error('Register error:', error);
      return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 });
    }

    const token = await createSessionToken({ sub: customer.id, phone: customer.phone, name: customer.name });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, customer: { id: customer.id, name: customer.name } });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
