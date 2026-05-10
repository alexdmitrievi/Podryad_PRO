import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)));
  const search = searchParams.get('search') ?? '';
  const channel = searchParams.get('channel') ?? '';
  const loyalty_tier = searchParams.get('loyalty_tier') ?? '';

  const db = getServiceClient();

  let query = db.from('bot_contacts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (loyalty_tier) query = query.eq('loyalty_tier', loyalty_tier);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }
  if (channel) {
    query = query.filter('preferred_channel', 'eq', channel);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({
    contacts: data ?? [],
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

  const { id, notes, loyalty_tier, unsubscribed } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, any> = {};
  if (notes !== undefined) update.notes = notes;
  if (loyalty_tier !== undefined) update.loyalty_tier = loyalty_tier;
  if (unsubscribed !== undefined) update.unsubscribed = unsubscribed;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { error } = await db.from('bot_contacts').update(update).eq('id', id);
  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
