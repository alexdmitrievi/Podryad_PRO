import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

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
      'order_id, order_number, work_type, subcategory, address, lat, lon, status, people_count, hours, work_date, created_at'
    )
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .in('status', ['pending', 'priced', 'payment_sent', 'paid', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    log.error('GET /api/orders/public', { error: String(error), code: (error as any)?.code, details: (error as any)?.details, hint: (error as any)?.hint, message: (error as any)?.message });
    return NextResponse.json({
      error: 'server_error',
      code: (error as any)?.code || '',
      message: (error as any)?.message || String(error),
    }, { status: 500 });
  }

  const orders = (data || []).map((o: any) => ({
    order_id: o.order_id,
    order_number: o.order_number,
    work_type: o.work_type,
    subcategory: o.subcategory,
    address: o.address,
    address_lat: o.lat,
    address_lng: o.lon,
    status: o.status,
    people_count: o.people_count,
    hours: o.hours,
    work_date: o.work_date,
    created_at: o.created_at,
  }));

  return NextResponse.json({ ok: true, orders });
}
