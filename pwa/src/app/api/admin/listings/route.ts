import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, randomUUID } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { getMarkupRate, applyMarkup } from '@/lib/pricing';

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

  const db = getServiceClient();
  const { data, error } = await db
    .from('listings')
    .select('listing_id, title, category_slug, listing_type, price, display_price, markup_percent, price_unit, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('GET /api/admin/listings:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, listings: data || [] });
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { listing_type, category_slug, title, price, price_unit } = body;
  if (!listing_type || !category_slug || !title || !price || !price_unit) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const basePrice = Number(price);
  if (isNaN(basePrice) || basePrice <= 0) {
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }

  const db = getServiceClient();
  const markupPercent = await getMarkupRate(db, String(listing_type), String(category_slug));
  const { displayPrice } = applyMarkup(basePrice, markupPercent);

  const listingId = `lst_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const { data, error } = await db
    .from('listings')
    .insert({
      listing_id: listingId,
      listing_type: String(listing_type),
      category_slug: String(category_slug),
      title: String(title).trim(),
      price: basePrice,
      display_price: displayPrice,
      markup_percent: markupPercent,
      price_unit: String(price_unit),
      is_active: true,
      city: 'Омск',
    })
    .select()
    .single();

  if (error) {
    console.error('POST /api/admin/listings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, listing: data }, { status: 201 });
}
