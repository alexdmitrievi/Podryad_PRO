import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)));
  const status = searchParams.get('status') ?? '';
  const source = searchParams.get('source') ?? '';
  const search = searchParams.get('search') ?? '';
  const channel = searchParams.get('channel') ?? '';

  const db = getServiceClient();

  let query = db.from('bot_leads')
    .select('*, bot_contacts!inner(full_name, phone, city)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (channel) query = query.eq('channel', channel);
  if (search) {
    const esc = search.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(
      `name.ilike.%${esc}%,admin_notes.ilike.%${esc}%` +
      `,bot_contacts(phone.ilike.%${esc}%,full_name.ilike.%${esc}%)`
    );
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    const msg = error?.message ? String(error.message) : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    leads: data ?? [],
    total: count ?? 0,
    page,
    per_page: perPage,
    pages: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  });
}

export async function PUT(req: NextRequest) {
  const db = getServiceClient();
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { id, status, admin_notes, next_followup_at, price_quoted, price_final } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, any> = {};
  if (status !== undefined) update.status = status;
  if (admin_notes !== undefined) update.admin_notes = admin_notes;
  if (next_followup_at !== undefined) update.next_followup_at = next_followup_at;
  if (price_quoted !== undefined) update.price_quoted = price_quoted;
  if (price_final !== undefined) update.price_final = price_final;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { error } = await db.from('bot_leads').update(update).eq('id', id);
  if (error) {
    const msg = error?.message ? String(error.message) : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
