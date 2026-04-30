import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { enqueueJob } from '@/lib/job-queue';

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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = await checkRateLimit(`leads:${ip}`, 20, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

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

  void enqueueJob({
    queueName: 'notifications',
    jobType: 'notify.lead_created',
    dedupeKey: `notify.lead_created:${leadId ?? digits}`,
    payload: leadPayload,
    sourceTable: 'leads',
    sourceId: leadId != null ? String(leadId) : undefined,
  }).catch((err) => {
    console.error('enqueueJob notify.lead_created error (non-blocking):', err);
  });

  // Nurture chain — 4 touch-points for the lead
  const nurtureBase = {
    queueName: 'crm',
    jobType: 'crm.customer_nurture_step' as const,
    payload: {
      phone: digits,
      work_type: work_type ?? '',
      city: city ?? '',
      name: name ?? '',
      lead_id: leadId != null ? String(leadId) : undefined,
    },
  };
  const now = Date.now();
  const nurtureSteps: Array<{ step: string; runAt: string; dedupeKey: string }> = [
    { step: 'welcome',      runAt: new Date(now).toISOString(),                         dedupeKey: `nurture:welcome:${leadId ?? digits}` },
    { step: 'followup_2h',  runAt: new Date(now + 2  * 60 * 60 * 1000).toISOString(),  dedupeKey: `nurture:2h:${leadId ?? digits}` },
    { step: 'followup_24h', runAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),  dedupeKey: `nurture:24h:${leadId ?? digits}` },
    { step: 'followup_72h', runAt: new Date(now + 72 * 60 * 60 * 1000).toISOString(),  dedupeKey: `nurture:72h:${leadId ?? digits}` },
  ];
  for (const step of nurtureSteps) {
    void enqueueJob({
      ...nurtureBase,
      dedupeKey: step.dedupeKey,
      runAt: step.runAt,
      payload: { ...nurtureBase.payload, step: step.step },
    }).catch((err) => {
      console.error(`enqueueJob nurture ${step.step} error (non-blocking):`, err);
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
