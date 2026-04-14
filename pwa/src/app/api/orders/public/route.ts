import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

/**
 * Public orders API — returns only customer-safe fields.
 * NEVER exposes: base_price, markup_percent, customer_phone, customer_name.
 *
 * Returns active orders with geo coordinates for map display.
 */
export async function GET() {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_id, order_number, work_type, subcategory, address, address_lat, address_lng, status, people_count, hours, work_date, created_at'
    )
    .not('address_lat', 'is', null)
    .not('address_lng', 'is', null)
    .in('status', ['pending', 'priced', 'payment_sent', 'paid', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('GET /api/orders/public:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orders: data || [] });
}
