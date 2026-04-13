import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const db = getServiceClient();

  // Get all markup rates
  const { data: rates, error: ratesErr } = await db
    .from('markup_rates')
    .select('listing_type, category, subcategory, markup_percent');

  if (ratesErr) {
    console.error('POST /api/admin/recalculate-prices:', ratesErr);
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
  }

  // Get all active listings
  const { data: listings, error: listErr } = await db
    .from('listings')
    .select('id, listing_type, category_slug, subcategory, price')
    .eq('is_active', true);

  if (listErr) {
    console.error('POST /api/admin/recalculate-prices:', listErr);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }

  let updated = 0;
  for (const listing of listings || []) {
    // Find best matching rate: subcategory > category > type-level
    const rate = (rates || []).find(
      (r) =>
        r.listing_type === listing.listing_type &&
        r.category === listing.category_slug &&
        r.subcategory === listing.subcategory
    ) || (rates || []).find(
      (r) =>
        r.listing_type === listing.listing_type &&
        r.category === listing.category_slug &&
        !r.subcategory
    ) || (rates || []).find(
      (r) =>
        r.listing_type === listing.listing_type &&
        !r.category &&
        !r.subcategory
    );

    if (rate) {
      const displayPrice = Number(listing.price) * (1 + rate.markup_percent / 100);
      const { error: upErr } = await db
        .from('listings')
        .update({
          display_price: Math.round(displayPrice * 100) / 100,
          markup_percent: rate.markup_percent,
        })
        .eq('id', listing.id);

      if (!upErr) updated++;
    }
  }

  return NextResponse.json({ ok: true, updated, total: (listings || []).length });
}
