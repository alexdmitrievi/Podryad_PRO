import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

/**
 * GET /api/admin/crm/prospects
 * Returns Avito prospects list.
 *
 * POST /api/admin/crm/prospects
 * Add a new Avito prospect manually.
 *
 * PUT /api/admin/crm/prospects
 * Update stage / notes / contact info for prospect.
 */
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');

  const db = getServiceClient();
  let query = db
    .from('crm_executor_prospects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (stage) {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prospects: data || [] });
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    name: string;
    phone?: string;
    city?: string;
    specialties?: string[];
    source?: string;
    avito_profile_url?: string;
    avito_user_id?: string;
    admin_notes?: string;
    avito_message_draft?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('crm_executor_prospects')
    .insert({
      name: body.name,
      phone: body.phone?.replace(/\D/g, '') || null,
      city: body.city || 'omsk',
      specialties: body.specialties || [],
      source: body.source || 'avito',
      avito_profile_url: body.avito_profile_url || null,
      avito_user_id: body.avito_user_id || null,
      admin_notes: body.admin_notes || null,
      avito_message_draft: body.avito_message_draft || null,
      stage: 'new',
    })
    .select()
    .single();

  if (error) {
    console.error('POST /api/admin/crm/prospects:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // Fire n8n conversion tracking webhook if prospect has phone
  const n8nWebhook = process.env.N8N_CRM_PROSPECT_WEBHOOK_URL;
  if (n8nWebhook && body.phone) {
    fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prospect_added',
        prospect: data,
      }),
    }).catch(() => { /* non-blocking */ });
  }

  return NextResponse.json({ ok: true, prospect: data });
}

export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    id: number;
    stage?: string;
    phone?: string | null;
    name?: string;
    admin_notes?: string;
    avito_message_draft?: string;
    avito_profile_url?: string;
    max_id?: string;
    telegram_id?: string;
    email?: string;
    specialties?: string[];
    next_followup_at?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: existingProspect } = await db
    .from('crm_executor_prospects')
    .select('id, stage, phone, name, city, specialties, source, max_id, telegram_id, email, next_followup_at')
    .eq('id', body.id)
    .maybeSingle();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.stage !== undefined) updates.stage = body.stage;
  if (body.phone !== undefined && body.phone !== null) updates.phone = (body.phone as string).replace(/\D/g, '');
  if (body.name !== undefined) updates.name = body.name;
  if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;
  if (body.avito_message_draft !== undefined) updates.avito_message_draft = body.avito_message_draft;
  if (body.avito_profile_url !== undefined) updates.avito_profile_url = body.avito_profile_url;
  if (body.max_id !== undefined) updates.max_id = body.max_id;
  if (body.telegram_id !== undefined) updates.telegram_id = body.telegram_id;
  if (body.email !== undefined) updates.email = body.email;
  if (body.specialties !== undefined) updates.specialties = body.specialties;
  if (body.next_followup_at !== undefined) updates.next_followup_at = body.next_followup_at;

  const { error } = await db.from('crm_executor_prospects').update(updates).eq('id', body.id);
  if (error) {
    console.error('PUT /api/admin/crm/prospects:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const prospectWebhook = process.env.N8N_CRM_PROSPECT_WEBHOOK_URL;
  const stageChanged = body.stage !== undefined && body.stage !== existingProspect?.stage;
  const mergedProspect = {
    ...existingProspect,
    ...updates,
    id: body.id,
    phone: typeof updates.phone === 'string' ? updates.phone : existingProspect?.phone ?? null,
  };

  if (prospectWebhook && stageChanged) {
    fetch(prospectWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prospect_stage_updated',
        previous_stage: existingProspect?.stage ?? null,
        prospect: mergedProspect,
      }),
    }).catch(() => { /* non-blocking */ });
  }

  return NextResponse.json({ ok: true });
}
