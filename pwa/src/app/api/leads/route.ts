import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

interface LeadBody {
  phone: string;
  work_type: string;
  city?: string;
  address?: string;
  messenger?: string;
  comment?: string;
  source?: string;
  name?: string;
  email?: string;
  telegram?: string;
}

/** Strip all non-digit characters from a phone string and return only digits. */
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  let body: LeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { phone, work_type, city, address, messenger, comment, source, name, email, telegram } = body;

  // Validate phone: require 10+ digits after stripping
  const digits = stripPhone(phone ?? '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  // Validate work_type
  const validWorkTypes = ['labor', 'equipment', 'materials', 'complex'];
  if (!work_type || !validWorkTypes.includes(work_type)) {
    return NextResponse.json({ error: 'invalid_work_type' }, { status: 422 });
  }

  const db = getServiceClient();

  // Geocode address if provided (non-blocking, best-effort)
  let lat: number | null = null;
  let lon: number | null = null;
  if (address?.trim()) {
    try {
      const cityPrefix = city === 'novosibirsk' ? 'Новосибирск' : 'Омск';
      const q = address.includes(cityPrefix) ? address : `${cityPrefix}, ${address}`;
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ru&countrycodes=ru`,
        { headers: { 'User-Agent': 'PodraydPRO/1.0' }, signal: AbortSignal.timeout(5000) }
      );
      const geoData = await geoRes.json();
      if (geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lon = parseFloat(geoData[0].lon);
      }
    } catch { /* geocoding is best-effort */ }
  }

  const { data: insertedLead, error } = await db.from('leads').insert({
    phone: digits,
    work_type,
    city: city ?? 'omsk',
    address: address?.trim() || null,
    lat,
    lon,
    messenger: messenger || null,
    comment: comment ?? null,
    source: source ?? 'landing',
    name: name?.trim() || null,
    email: email?.trim() || null,
    telegram: telegram?.trim() || null,
  }).select('id').single();

  if (error) {
    console.error('POST /api/leads:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const leadId = insertedLead?.id ?? null;
  const leadPayload = {
    lead_id: leadId,
    phone: digits, work_type, city: city ?? 'omsk',
    address, messenger, comment, name, email, telegram,
    source: source ?? 'landing',
    lat, lon,
  };

  // Fire-and-forget: n8n lead notification (existing)
  const webhookUrl = process.env.N8N_LEADS_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload),
    }).catch((err) => {
      console.error('n8n lead webhook error (non-blocking):', err);
    });
  }

  // Fire-and-forget: CRM nurture agent (new) — starts the customer conversion pipeline
  const crmNurtureUrl = process.env.N8N_CRM_LEAD_NURTURE_WEBHOOK_URL;
  if (crmNurtureUrl) {
    fetch(crmNurtureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload),
    }).catch((err) => {
      console.error('n8n CRM nurture webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
