import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';

interface LaborOrderBody {
  type: 'labor';
  work_type: string;
  people: number;
  rate: number;
  unit: string;
  quantity: number;
  address: string;
  lat: number;
  lon: number;
  comment?: string;
  phone: string;
}

interface RentalOrderBody {
  type: 'rental';
  equipment_type: string;
  with_operator: boolean;
  unit: string;
  quantity: number;
  address: string;
  lat: number;
  lon: number;
  comment?: string;
  phone: string;
}

type OrderBody = LaborOrderBody | RentalOrderBody;

function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = await checkRateLimit(`order-create:${ip}`, 10, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: OrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { address, lat, lon, comment, phone } = body;

  // Validate common fields
  const digits = stripPhone(phone ?? '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }
  if (!address || !lat || !lon) {
    return NextResponse.json({ error: 'missing_location' }, { status: 422 });
  }

  const db = getServiceClient();

  if (body.type === 'labor') {
    const { work_type, people, rate, unit, quantity } = body;
    if (!work_type || !people || !rate) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
    }

    const customerTotal = rate * quantity * people;
    const yandexLink = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16`;

    const orderData = {
      order_id: `web-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      customer_id: digits,
      customer_phone: digits,
      address,
      // Legacy columns (schema.sql) — kept for WF-07 partial index
      lat,
      lon,
      // Migration-011 columns — used by public map and admin CRM
      address_lat: lat,
      address_lng: lon,
      yandex_link: yandexLink,
      work_type,
      // Legacy column
      people,
      // Migration-011 column — used by /api/orders/public
      people_count: people,
      hours: unit === 'hour' ? quantity : unit === 'shift' ? quantity * 8 : quantity,
      time: new Date().toISOString(),
      payment_text: `${rate} ₽/${unit} × ${quantity} × ${people} чел.`,
      comment: comment || null,
      status: 'pending',
      customer_total: customerTotal,
      client_rate: rate,
    };

    const { error } = await db.from('orders').insert(orderData);
    if (error) {
      console.error('POST /api/orders/create (labor):', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    // Also create a lead for admin tracking
    try {
      await db.from('leads').insert({
        phone: digits,
        work_type: 'labor',
        city: 'omsk',
        comment: `Заказ рабочих: ${work_type}, ${people} чел., ${rate} ₽/${unit} × ${quantity} | Адрес: ${address}${comment ? ` | ${comment}` : ''}`,
        source: 'order_form',
      });
    } catch { /* non-critical */ }

    // n8n webhook
    const webhookUrl = process.env.N8N_LEADS_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_order',
          order_type: 'labor',
          work_type,
          people,
          rate,
          unit,
          quantity,
          address,
          lat,
          lon,
          phone: digits,
          comment,
          customer_total: customerTotal,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, order_id: orderData.order_id }, { status: 201 });
  }

  if (body.type === 'rental') {
    const { equipment_type, with_operator, unit: rentalUnit, quantity } = body;
    if (!equipment_type) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
    }

    const yandexLink = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16`;

    const orderData = {
      order_id: `rental-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      customer_id: digits,
      customer_phone: digits,
      address,
      lat,
      lon,
      address_lat: lat,
      address_lng: lon,
      yandex_link: yandexLink,
      work_type: 'equipment',
      people: 0,
      people_count: 0,
      hours: rentalUnit === 'hour' ? quantity : rentalUnit === 'shift' ? quantity * 8 : quantity * 24,
      time: new Date().toISOString(),
      payment_text: `${equipment_type} × ${quantity} ${rentalUnit}${with_operator ? ' (с оператором)' : ''}`,
      comment: `Техника: ${equipment_type}${with_operator ? ', с оператором' : ', без оператора'}${comment ? ` | ${comment}` : ''}`,
      status: 'pending',
    };

    const { error } = await db.from('orders').insert(orderData);
    if (error) {
      console.error('POST /api/orders/create (rental):', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    // Lead for tracking
    try {
      await db.from('leads').insert({
        phone: digits,
        work_type: 'equipment',
        city: 'omsk',
        comment: `Аренда техники: ${equipment_type}, ${quantity} ${rentalUnit}${with_operator ? ', с оператором' : ''}${comment ? ` | ${comment}` : ''} | Адрес: ${address}`,
        source: 'rental_form',
      });
    } catch { /* non-critical */ }

    // n8n webhook
    const webhookUrl = process.env.N8N_LEADS_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_order',
          order_type: 'rental',
          equipment_type,
          with_operator,
          unit: rentalUnit,
          quantity,
          address,
          lat,
          lon,
          phone: digits,
          comment,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, order_id: orderData.order_id }, { status: 201 });
  }

  return NextResponse.json({ error: 'invalid_type' }, { status: 422 });
}
