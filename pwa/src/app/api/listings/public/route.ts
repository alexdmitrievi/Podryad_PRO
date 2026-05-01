import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { log } from '@/lib/logger';

/**
 * Public listings API — returns only customer-safe fields.
 * NEVER exposes: price (base_price), markup_percent.
 *
 * Query params:
 *   type — 'material' | 'equipment_rental'
 *   category — category_slug filter (e.g. 'concrete', 'excavator')
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const category = searchParams.get('category');

  let query = supabase
    .from('listings')
    .select('listing_id, title, description, display_price, price_unit, images, category_slug, listing_type, city, discount_percent, includes_operator, year_manufactured, min_rental_hours, specs_json')
    .eq('is_active', true)
    .order('display_price', { ascending: true })
    .limit(100);

  if (type) {
    query = query.eq('listing_type', type);
  }
  if (category) {
    query = query.eq('category_slug', category);
  }

  const { data, error } = await query;
  if (error) {
    log.error('GET /api/listings/public', { error: String(error) });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ listings: data || [] });
}
