import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByToken, getOrdersByCustomerPhone } from '@/lib/db';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 });
    }

    const customer = await getCustomerByToken(token);
    if (!customer) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const rawOrders = await getOrdersByCustomerPhone(
      (customer as Record<string, unknown>).phone as string,
    );

    // Map to safe public fields only — NEVER expose base_price, markup_percent,
    // supplier_payout, platform_margin, worker_rate, client_rate
    const orders = (rawOrders as Record<string, unknown>[]).map((o) => ({
      id: o.order_id,
      order_id: o.order_id,
      order_number: o.order_number,
      work_type: o.work_type,
      subcategory: o.subcategory,
      customer_comment: o.customer_comment,
      address: o.address,
      work_date: o.work_date,
      people_count: o.people_count,
      hours: o.hours,
      status: o.status,
      display_price: o.display_price ?? o.customer_total,
      created_at: o.created_at,
      customer_confirmed: o.customer_confirmed,
      supplier_confirmed: o.supplier_confirmed,
    }));

    return NextResponse.json({
      ok: true,
      phone: (customer as Record<string, unknown>).phone,
      orders,
    });
  } catch (err) {
    log.error('GET /api/orders/my', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
