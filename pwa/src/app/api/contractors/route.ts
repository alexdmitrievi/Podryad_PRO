import { NextRequest, NextResponse } from 'next/server';
import { createContractor } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

/** Strip all non-digit characters from a phone string and return only digits. */
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = checkRateLimit(`contractors:${ip}`, 5, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

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
    is_brigade,
    crew_size,
    has_transport,
    has_tools,
    payout_type,
    payout_sbp_phone,
    payout_bank_details,
    is_legal_entity,
    inn,
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
      is_brigade: is_brigade === true,
      crew_size: is_brigade === true && crew_size != null ? Number(crew_size) : undefined,
      has_transport: is_brigade === true ? !!has_transport : undefined,
      has_tools: is_brigade === true ? !!has_tools : undefined,
      payout_type: payout_type != null ? String(payout_type) : undefined,
      payout_sbp_phone: payout_sbp_phone != null ? String(payout_sbp_phone) : undefined,
      payout_bank_details: payout_bank_details != null ? String(payout_bank_details) : undefined,
      is_legal_entity: is_legal_entity === true,
      inn: inn != null ? String(inn) : undefined,
    });
  } catch (err) {
    console.error('POST /api/contractors createContractor:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const contractorId = (contractor as Record<string, unknown>).id as string;

  // Fire-and-forget: n8n contractor registered notification (existing)
  const webhookUrl = process.env.N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractor_id: contractorId,
        name: String(name).trim(),
        phone: digits,
        city: cityStr,
        specialties,
        preferred_contact,
        is_brigade: is_brigade === true,
        crew_size: is_brigade === true && crew_size != null ? Number(crew_size) : undefined,
      }),
    }).catch((err) => {
      console.error('n8n contractor_registered webhook error (non-blocking):', err);
    });
  }

  // Fire-and-forget: CRM conversion tracker — executor registered
  const crmConversionUrl = process.env.N8N_CRM_CONVERSION_WEBHOOK_URL;
  if (crmConversionUrl) {
    fetch(crmConversionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'contractor_registered',
        phone: digits,
        entity_id: contractorId,
        entity_type: 'contractor',
      }),
    }).catch((err) => {
      console.error('n8n CRM conversion webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json(
    { ok: true, contractor_id: contractorId },
    { status: 201 },
  );
}
