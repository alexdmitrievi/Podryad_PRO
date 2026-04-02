import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { getMarkupRate, applyMarkup } from '@/lib/pricing';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!verifyPin(String(body.pin ?? ''))) {
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 });
  }

  const db = getServiceClient();

  // Fetch all active listings
  const { data: listings, error: fetchErr } = await db
    .from('unified_listings')
    .select('id, listing_type, category, subcategory, base_price')
    .eq('is_active', true);

  if (fetchErr) {
    // Table may not exist yet — return gracefully
    if (fetchErr.code === '42P01') {
      return NextResponse.json({ ok: true, updated: 0, note: 'unified_listings table not yet created' });
    }
    console.error('POST /api/admin/recalculate-prices fetch error:', fetchErr);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  let updated = 0;
  for (const listing of listings || []) {
    const markupPct = await getMarkupRate(
      db,
      String(listing.listing_type),
      listing.category ? String(listing.category) : undefined,
      listing.subcategory ? String(listing.subcategory) : undefined
    );
    const { displayPrice } = applyMarkup(Number(listing.base_price), markupPct);

    const { error: updateErr } = await db
      .from('unified_listings')
      .update({ display_price: displayPrice, markup_percent: markupPct })
      .eq('id', listing.id);

    if (updateErr) {
      console.error('POST /api/admin/recalculate-prices update error:', updateErr);
    } else {
      updated++;
    }
  }

  return NextResponse.json({ ok: true, updated });
}
