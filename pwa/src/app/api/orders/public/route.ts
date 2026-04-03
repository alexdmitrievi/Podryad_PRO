import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Public orders API — returns only safe fields for the dashboard.
 * Shows published orders that executors can respond to.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('orders')
    .select('order_id, order_number, address, lat, lon, work_type, people, hours, comment, created_at, customer_total')
    .in('status', ['published', 'paid'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('GET /api/orders/public:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}
