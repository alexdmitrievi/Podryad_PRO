import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, randomUUID } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

const DISCOUNT = 20; // always 20% for own equipment

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

function calcDisplayPrice(price: number): number {
  return Math.round(price * (1 - DISCOUNT / 100));
}

/**
 * GET /api/admin/own-equipment
 * Returns all own_equipment listings (full data, admin-only).
 */
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getServiceClient();
  const { data, error } = await db
    .from('listings')
    .select('listing_id, title, description, price, display_price, discount_percent, price_unit, images, category_slug, specs_json, includes_operator, year_manufactured, vehicle_number, min_rental_hours, max_rental_days, is_active, city, created_at')
    .eq('listing_type', 'own_equipment')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/admin/own-equipment:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data || [] });
}

/**
 * POST /api/admin/own-equipment
 * Create a new own equipment listing.
 * price = full market rate; display_price auto-set to price * 0.8 (20% off).
 */
export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: {
    title: string;
    description?: string;
    category_slug: string;
    price: number;
    price_unit: string;
    specs_json?: Record<string, string>;
    includes_operator?: boolean;
    year_manufactured?: number;
    vehicle_number?: string;
    min_rental_hours?: number;
    max_rental_days?: number;
    city?: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { title, category_slug, price, price_unit } = body;
  if (!title || !category_slug || !price || !price_unit) {
    return NextResponse.json({ error: 'title, category_slug, price, price_unit required' }, { status: 400 });
  }

  const basePrice = Number(price);
  if (isNaN(basePrice) || basePrice <= 0) {
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }

  const listingId = `own_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const db = getServiceClient();
  const { data, error } = await db
    .from('listings')
    .insert({
      listing_id: listingId,
      listing_type: 'own_equipment',
      category_slug: String(category_slug),
      title: String(title).trim(),
      description: body.description?.trim() || null,
      price: basePrice,
      display_price: calcDisplayPrice(basePrice),
      markup_percent: -DISCOUNT,
      discount_percent: DISCOUNT,
      price_unit: String(price_unit),
      specs_json: body.specs_json || {},
      includes_operator: body.includes_operator ?? false,
      year_manufactured: body.year_manufactured || null,
      vehicle_number: body.vehicle_number?.trim() || null,
      min_rental_hours: body.min_rental_hours || 4,
      max_rental_days: body.max_rental_days || 30,
      city: body.city || 'Омск',
      is_active: true,
      images: [],
    })
    .select()
    .single();

  if (error) {
    console.error('POST /api/admin/own-equipment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}

/**
 * PUT /api/admin/own-equipment
 * Update existing own equipment listing.
 */
export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: {
    listing_id: string;
    title?: string;
    description?: string;
    price?: number;
    price_unit?: string;
    category_slug?: string;
    specs_json?: Record<string, string>;
    includes_operator?: boolean;
    year_manufactured?: number;
    vehicle_number?: string;
    min_rental_hours?: number;
    max_rental_days?: number;
    is_active?: boolean;
    city?: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.price_unit !== undefined) updates.price_unit = body.price_unit;
  if (body.category_slug !== undefined) updates.category_slug = body.category_slug;
  if (body.specs_json !== undefined) updates.specs_json = body.specs_json;
  if (body.includes_operator !== undefined) updates.includes_operator = body.includes_operator;
  if (body.year_manufactured !== undefined) updates.year_manufactured = body.year_manufactured;
  if (body.vehicle_number !== undefined) updates.vehicle_number = body.vehicle_number?.trim() || null;
  if (body.min_rental_hours !== undefined) updates.min_rental_hours = body.min_rental_hours;
  if (body.max_rental_days !== undefined) updates.max_rental_days = body.max_rental_days;
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
  if (body.city !== undefined) updates.city = body.city;

  if (body.price !== undefined) {
    const basePrice = Number(body.price);
    if (isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
    }
    updates.price = basePrice;
    updates.display_price = calcDisplayPrice(basePrice);
  }

  const db = getServiceClient();
  const { error } = await db
    .from('listings')
    .update(updates)
    .eq('listing_id', body.listing_id)
    .eq('listing_type', 'own_equipment');

  if (error) {
    console.error('PUT /api/admin/own-equipment:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/own-equipment?id=xxx
 * Soft-delete (set is_active = false) or hard-delete.
 */
export async function DELETE(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const listingId = req.nextUrl.searchParams.get('id');
  if (!listingId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getServiceClient();
  const { error } = await db
    .from('listings')
    .delete()
    .eq('listing_id', listingId)
    .eq('listing_type', 'own_equipment');

  if (error) {
    console.error('DELETE /api/admin/own-equipment:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
