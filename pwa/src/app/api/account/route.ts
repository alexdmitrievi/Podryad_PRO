import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/customerAuth';
import { getServiceClient } from '@/lib/supabase';
import { hashPassword, verifyPassword } from '@/lib/customerAuth';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getServiceClient();
  const { data: orders } = await db
    .from('orders')
    .select('id, work_type, subcategory, description, address, work_date, status, display_price, customer_total, created_at, city')
    .eq('customer_phone', session.phone)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ orders: orders || [] });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, customer_type, org_name, inn, city, preferred_contact, current_password, new_password } = body;

    const db = getServiceClient();
    const updates: Record<string, unknown> = {};

    if (name) updates.name = String(name).trim();
    if (customer_type) updates.customer_type = customer_type;
    if (org_name !== undefined) updates.org_name = org_name ? String(org_name).trim() : null;
    if (inn !== undefined) updates.inn = inn ? String(inn).trim() : null;
    if (city !== undefined) updates.city = city || null;
    if (preferred_contact) updates.preferred_contact = preferred_contact;

    // Password change
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'Введите текущий пароль' }, { status: 400 });
      }
      const pwd = String(new_password);
      if (pwd.length < 8) {
        return NextResponse.json({ error: 'Новый пароль минимум 8 символов' }, { status: 400 });
      }
      if (!/[A-ZА-Я]/.test(pwd) || !/[0-9]/.test(pwd)) {
        return NextResponse.json({ error: 'Пароль должен содержать заглавную букву и цифру' }, { status: 400 });
      }
      const { data: cust } = await db
        .from('customers')
        .select('password_hash')
        .eq('id', session.sub)
        .single();
      if (!cust || !(await verifyPassword(String(current_password), cust.password_hash))) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 });
      }
      updates.password_hash = await hashPassword(String(new_password));
    }

    const { error } = await db
      .from('customers')
      .update(updates)
      .eq('id', session.sub);

    if (error) return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
