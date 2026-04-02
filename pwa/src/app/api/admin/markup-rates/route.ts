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
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('markup_rates')
    .select('*')
    .order('listing_type')
    .order('category', { nullsFirst: true })
    .order('subcategory', { nullsFirst: true });

  if (error) {
    console.error('GET /api/admin/markup-rates error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rates: data || [] });
}

export async function PUT(req: NextRequest) {
  let body: { pin?: string; rates?: Array<{ id?: string; listing_type: string; category?: string | null; subcategory?: string | null; markup_percent: number }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!verifyPin(String(body.pin ?? ''))) {
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 });
  }

  if (!Array.isArray(body.rates)) {
    return NextResponse.json({ error: 'rates must be an array' }, { status: 400 });
  }

  const db = getServiceClient();

  for (const rate of body.rates) {
    if (typeof rate.markup_percent !== 'number' || rate.markup_percent < 0 || rate.markup_percent > 200) {
      return NextResponse.json({ error: 'Invalid markup_percent' }, { status: 400 });
    }

    if (rate.id) {
      const { error } = await db
        .from('markup_rates')
        .update({ markup_percent: rate.markup_percent })
        .eq('id', rate.id);
      if (error) {
        console.error('PUT /api/admin/markup-rates update error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }
    } else {
      const { error } = await db
        .from('markup_rates')
        .upsert(
          {
            listing_type: rate.listing_type,
            category: rate.category ?? null,
            subcategory: rate.subcategory ?? null,
            markup_percent: rate.markup_percent,
          },
          { onConflict: 'listing_type,category,subcategory' }
        );
      if (error) {
        console.error('PUT /api/admin/markup-rates upsert error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
