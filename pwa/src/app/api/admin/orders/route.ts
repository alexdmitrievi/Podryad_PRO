import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('orders')
    .select('order_id, order_number, status, payment_status, executor_payout_status, customer_type, customer_total, supplier_payout, platform_margin, created_at, customer_phone, customer_name, address, work_date, people_count, hours, work_type, subcategory, customer_comment, preferred_contact, contractor_id, display_price')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    log.error('GET /api/admin/orders', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orders: data || [] });
}
