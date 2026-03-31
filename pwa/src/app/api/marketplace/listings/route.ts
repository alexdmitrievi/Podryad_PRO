import { NextRequest, NextResponse } from 'next/server';
import { getListings, createListing, getSupplierByPhone } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category') || undefined;
    const city = searchParams.get('city') || undefined;
    const type = searchParams.get('type') as 'material' | 'heavy_equipment' | undefined;

    const listings = await getListings({ category, city, type });
    return NextResponse.json(listings);
  } catch (e) {
    console.error('GET /api/marketplace/listings:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'supplier') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const phone = session.user_id.replace('reg:', '');
    const supplier = await getSupplierByPhone(phone);
    if (!supplier) {
      return NextResponse.json({ error: 'supplier_not_found' }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const { category_slug, title, description, specs, price, price_unit, min_order,
            delivery_included, delivery_price, delivery_note, city } = body;

    if (!category_slug || !title || !price || !price_unit) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
    }

    const listing = await createListing({
      listing_id: `lst_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      supplier_id: supplier.id,
      category_slug,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      specs: specs ? String(specs).trim() : null,
      price: priceNum,
      price_unit: String(price_unit),
      min_order: min_order ? String(min_order) : null,
      delivery_included: Boolean(delivery_included),
      delivery_price: delivery_price ? Number(delivery_price) : null,
      delivery_note: delivery_note ? String(delivery_note).trim() : null,
      city: city ? String(city) : supplier.city || 'Омск',
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (e) {
    console.error('POST /api/marketplace/listings:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
