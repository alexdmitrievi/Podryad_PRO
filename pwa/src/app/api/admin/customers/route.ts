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
    const body = await req.json();
    const { id, admin_notes } = body || {};
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (admin_notes === undefined) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
    }

    const db = getServiceClient();
    const { error } = await db
      .from('customers')
      .update({ admin_notes, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      const msg = error?.message ? String(error.message) : String(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : String(err);
    log.error('PUT /api/admin/customers', { error: msg });
    const code = msg.includes('uuid') || msg.includes('invalid') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
