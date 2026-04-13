import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('markup_rates')
    .select('id, listing_type, category, subcategory, markup_percent, created_at')
    .order('listing_type')
    .order('category');

  if (error) {
    console.error('GET /api/admin/markup-rates:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rates: data || [] });
}

export async function PUT(req: NextRequest) {
  let body: { id?: number; markup_percent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id || typeof body.markup_percent !== 'number') {
    return NextResponse.json({ error: 'id and markup_percent required' }, { status: 400 });
  }

  if (body.markup_percent < 0 || body.markup_percent > 100) {
    return NextResponse.json({ error: 'markup_percent must be 0-100' }, { status: 400 });
  }

  const db = getServiceClient();
  const { error } = await db
    .from('markup_rates')
    .update({ markup_percent: body.markup_percent })
    .eq('id', body.id);

  if (error) {
    console.error('PUT /api/admin/markup-rates:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
