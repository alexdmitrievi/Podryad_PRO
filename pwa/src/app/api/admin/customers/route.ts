import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const db = getServiceClient();
    const { data: customers, error } = await db
      .from('customers')
      .select('id, phone, name, customer_type, org_name, inn, city, preferred_contact, admin_notes, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, customers: customers || [] });
  } catch (err) {
    log.error('GET /api/admin/customers', { error: String(err) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    log.error('PUT /api/admin/customers', { error: String(err) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
