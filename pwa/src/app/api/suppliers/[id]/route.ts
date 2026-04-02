import { NextResponse } from 'next/server';
import { getSupplierById, getPublicListingsBySupplier } from '@/lib/db';
import { getServiceClient } from '@/lib/supabase';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const supplier = await getSupplierById(id);
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Public fields only — never expose base pricing, payout details, or INN
    const publicSupplier = {
      id: supplier.id,
      company_name: supplier.company_name,
      contact_name: supplier.contact_name,
      city: supplier.city,
      delivery_available: supplier.delivery_available,
      is_verified: supplier.is_verified,
      worker_type: supplier.worker_type ?? 'individual',
      crew_size: supplier.crew_size ?? 1,
      rating: supplier.rating ?? 0,
      completed_orders: supplier.completed_orders ?? 0,
      description: supplier.description ?? null,
      name: supplier.name ?? supplier.company_name,
    };

    const listings = await getPublicListingsBySupplier(id);

    // Fetch reviews (gracefully handle if table not yet created)
    let reviews: unknown[] = [];
    try {
      const db = getServiceClient();
      const { data } = await db
        .from('reviews')
        .select('id, rating, comment, customer_name, created_at')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      reviews = data ?? [];
    } catch {
      // reviews table may not exist yet
    }

    return NextResponse.json({ supplier: publicSupplier, listings, reviews });
  } catch (error) {
    console.error('GET /api/suppliers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
