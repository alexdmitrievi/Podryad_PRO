import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { calculateOrderTotals, type OrderItem } from '@/lib/pricing';
import { randomUUID } from 'crypto';

interface PlaceOrderBody {
  items: {
    listing_id: number;
    title: string;
    base_unit_price: number;
    display_unit_price: number;
    quantity: number;
    listing_type: string;
    price_unit: string;
    supplier_id?: string;
  }[];
  customer: {
    name: string;
    phone: string;
    scheduled_date?: string;
    time?: string;
    comment?: string;
  };
}

export async function POST(req: NextRequest) {
  let body: PlaceOrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { items, customer } = body;

  if (!items?.length) {
    return NextResponse.json({ error: 'no_items' }, { status: 400 });
  }
  if (!customer?.phone || !customer?.name) {
    return NextResponse.json({ error: 'missing_customer_fields' }, { status: 400 });
  }

  // Calculate totals
  const orderItems: OrderItem[] = items.map((i) => ({
    baseUnitPrice: i.base_unit_price,
    displayUnitPrice: i.display_unit_price,
    quantity: i.quantity,
    listingType: i.listing_type,
  }));

  const totals = calculateOrderTotals(orderItems);

  const db = getServiceClient();

  // Use first item's supplier_id as main supplier (single-supplier orders for now)
  const supplierId = items[0]?.supplier_id ?? null;

  const orderId = `ord_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const { data, error } = await db
    .from('orders')
    .insert({
      order_id: orderId,
      customer_id: customer.phone,
      customer_phone: customer.phone,
      customer_name: customer.name,
      address: customer.comment || '',
      work_type: items.map((i) => i.title).join(', ').slice(0, 100),
      time: customer.time || '',
      scheduled_date: customer.scheduled_date || null,
      people: 1,
      hours: 1,
      payment_text: 'escrow',
      status: 'pending_payment',
      customer_total: totals.customerTotal,
      supplier_payout: totals.supplierPayout,
      platform_margin: totals.platformMargin,
      combo_discount: totals.comboDiscount,
      supplier_id: supplierId,
      order_items: items,
    })
    .select('order_id, order_number')
    .single();

  if (error) {
    console.error('POST /api/orders/place:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({
    order_id: data.order_id,
    order_number: data.order_number,
    customer_total: totals.customerTotal,
    combo_discount: totals.comboDiscount,
  }, { status: 201 });
}
