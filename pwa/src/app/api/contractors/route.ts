import { NextRequest, NextResponse } from 'next/server';
import { createContractor } from '@/lib/db';

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
    name,
    phone,
    city,
    specialties,
    experience,
    preferred_contact,
    about,
    telegram_id,
    max_id,
    email,
  } = body as Record<string, unknown>;

  // Validate name
  if (!name || String(name).trim().length === 0) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 422 });
  }

  // Validate phone: require 10+ digits after stripping
  const digits = stripPhone(String(phone ?? ''));
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  // Validate specialties
  if (!Array.isArray(specialties) || (specialties as unknown[]).length === 0) {
    return NextResponse.json({ error: 'invalid_specialties' }, { status: 422 });
  }

  // Validate city
  const validCities = ['omsk', 'novosibirsk'];
  const cityStr = city != null ? String(city) : 'omsk';
  if (!validCities.includes(cityStr)) {
    return NextResponse.json({ error: 'invalid_city' }, { status: 422 });
  }

  let contractor: Record<string, unknown>;
  try {
    contractor = await createContractor({
      name: String(name).trim(),
      phone: digits,
      city: cityStr,
      specialties: (specialties as unknown[]).map(String),
      experience: experience != null ? String(experience) : undefined,
      preferred_contact: preferred_contact != null ? String(preferred_contact) : undefined,
      about: about != null ? String(about) : undefined,
      telegram_id: telegram_id != null ? String(telegram_id) : undefined,
      max_id: max_id != null ? String(max_id) : undefined,
      email: email != null ? String(email) : undefined,
    });
  } catch (err) {
    console.error('POST /api/contractors createContractor:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Fire-and-forget webhook to n8n (never blocks response)
  const webhookUrl = process.env.N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractor_id: (contractor as Record<string, unknown>).id,
        name: String(name).trim(),
        phone: digits,
        city: cityStr,
        specialties,
        preferred_contact,
      }),
    }).catch((err) => {
      console.error('n8n contractor_registered webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json(
    { ok: true, contractor_id: (contractor as Record<string, unknown>).id },
    { status: 201 },
  );
}
