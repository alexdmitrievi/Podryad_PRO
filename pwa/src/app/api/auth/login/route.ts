import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/customerAuth';

export async function POST(req: NextRequest) {
  try {
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

    const token = await createSessionToken({ sub: customer.id, phone: customer.phone, name: customer.name });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, customer: { id: customer.id, name: customer.name } });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
