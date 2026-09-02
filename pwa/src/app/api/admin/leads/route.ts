import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('leads')
    .select('id, phone, work_type, city, comment, source, score, company, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    log.error('GET /api/admin/leads', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leads: data || [] });
}


export async function PATCH(req: NextRequest) {
  let body: { id: number | string; commission_percent?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  let commission: number | null = null;
  if (body.commission_percent === null || body.commission_percent === undefined) {
    commission = null;
  } else {
    const n = Number(body.commission_percent);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      return NextResponse.json({ error: 'invalid commission' }, { status: 400 });
    }
    commission = n;
  }

  const db = getServiceClient();
  const { error } = await db.from('leads').update({ commission_percent: commission }).eq('id', id);
  if (error) {
    log.error('PATCH /api/admin/leads', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
