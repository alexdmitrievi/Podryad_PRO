import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrCreateCustomerToken } from '@/lib/db';

/** Strip all non-digit characters from a phone string and return only digits. */
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const {
    work_type,
    subcategory,
    description,
    address,
    address_lat,
    address_lng,
    work_date,
    people_count,
    hours,
    city,
    phone,
    customer_name,
    preferred_contact,
    combo_components,
  } = body as Record<string, unknown>;

  // Validate phone: require 10+ digits after stripping
  const digits = stripPhone(String(phone ?? ''));
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  // Validate work_type
  const validWorkTypes = ['labor', 'equipment', 'materials', 'complex', 'combo'];
  if (!work_type || !validWorkTypes.includes(String(work_type))) {
    return NextResponse.json({ error: 'invalid_work_type' }, { status: 422 });
  }

  let order: Record<string, unknown>;
  try {
    order = await createOrder({
      order_id: `pwa-${crypto.randomUUID()}`,
      status: 'pending',
      work_type: String(work_type),
      subcategory: subcategory != null ? String(subcategory) : null,
      customer_comment: [
        description != null ? String(description) : '',
        Array.isArray(combo_components) && combo_components.length > 0
          ? `Комбо: ${(combo_components as string[]).join(', ')}`
          : '',
      ].filter(Boolean).join(' | ') || null,
      address: address != null ? String(address) : null,
      address_lat: address_lat != null ? Number(address_lat) : null,
      address_lng: address_lng != null ? Number(address_lng) : null,
      work_date: work_date != null ? String(work_date) : null,
      people_count: people_count != null ? Number(people_count) : null,
      hours: hours != null ? Number(hours) : null,
      city: city != null ? String(city) : 'omsk',
      customer_phone: digits,
      customer_name: customer_name != null ? String(customer_name) : null,
    });
  } catch (err) {
    console.error('POST /api/orders createOrder:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  let tokenRow: Record<string, unknown>;
  try {
    tokenRow = await getOrCreateCustomerToken(
      digits,
      preferred_contact != null ? String(preferred_contact) : undefined,
    );
  } catch (err) {
    console.error('POST /api/orders getOrCreateCustomerToken:', err);
    return NextResponse.json({ error: 'token_error' }, { status: 500 });
  }

  // Fire-and-forget webhook to n8n (never blocks response)
  const webhookUrl = process.env.N8N_ORDER_CREATED_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.order_id,
        work_type,
        phone: digits,
        customer_name,
        city,
        address,
        work_date,
        people_count,
        hours,
      }),
    }).catch((err) => {
      console.error('n8n order_created webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json(
    {
      ok: true,
      order_id: order.order_id,
      access_token: (tokenRow as Record<string, unknown>).access_token,
    },
    { status: 201 },
  );
}
