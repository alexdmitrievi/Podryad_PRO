import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(adminPin);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') || '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  const pin = req.headers.get('x-admin-pin') || '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { id?: number; markup_percent?: number; rates?: { id: number; markup_percent: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const db = getServiceClient();

  // Support batch update (array of rates)
  if (Array.isArray(body.rates)) {
    let updated = 0;
    for (const rate of body.rates) {
      if (!rate.id || typeof rate.markup_percent !== 'number') continue;
      if (rate.markup_percent < 0 || rate.markup_percent > 100) continue;
      const { error } = await db
        .from('markup_rates')
        .update({ markup_percent: rate.markup_percent })
        .eq('id', rate.id);
      if (!error) updated++;
    }
    return NextResponse.json({ ok: true, updated });
  }

  // Single update
  if (!body.id || typeof body.markup_percent !== 'number') {
    return NextResponse.json({ error: 'id and markup_percent required' }, { status: 400 });
  }

  if (body.markup_percent < 0 || body.markup_percent > 100) {
    return NextResponse.json({ error: 'markup_percent must be 0-100' }, { status: 400 });
  }

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
