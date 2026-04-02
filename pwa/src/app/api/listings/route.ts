import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type') as 'labor' | 'material' | 'equipment_rental' | null;
    const category = searchParams.get('category') || undefined;
    const city = searchParams.get('city') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const db = getServiceClient();

    let query = db
      .from('listings')
      .select(
        `id, title, description, listing_type, category_slug, subcategory,
         display_price, price_unit, images, rating, orders_count, is_priority, city,
         supplier_id,
         suppliers(name, company_name, worker_type, crew_size, rating, completed_orders, is_verified)`,
        { count: 'exact' }
      )
      .eq('is_active', true);

    if (type) query = query.eq('listing_type', type);
    if (category) query = query.eq('category_slug', category);
    if (city && city !== 'all') query = query.eq('city', city);

    // Sort: бригады выше одиночек → is_priority → rating → orders_count
    query = query
      .order('is_priority', { ascending: false })
      .order('rating', { ascending: false })
      .order('orders_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const listings = (data || []).map((l) => {
      const { display_price, ...rest } = l as Record<string, unknown>;
      return { ...rest, price: display_price };
    });

    return NextResponse.json({
      listings,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (e) {
    console.error('GET /api/listings:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
