import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const db = getServiceClient();
    const { data: customers, error } = await db
      .from('customers')
      .select('id, phone, name, customer_type, org_name, inn, city, preferred_contact, admin_notes, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, customers: customers || [] });
  } catch (err) {
    console.error('GET /api/admin/customers:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, admin_notes } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getServiceClient();
    const { error } = await db
      .from('customers')
      .update({ admin_notes })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/admin/customers:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
