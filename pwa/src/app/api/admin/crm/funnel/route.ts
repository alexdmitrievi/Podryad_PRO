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
 * GET /api/admin/crm/funnel
 * Returns the full customer funnel + executor prospects pipeline.
 */
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getServiceClient();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 1000), 1000);
  const offset = Number(searchParams.get('offset') || 0);

  const [leadsResult, prospectsResult] = await Promise.all([
    db
      .from('crm_lead_funnel')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    db
      .from('crm_executor_prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
  ]);

  if (leadsResult.error) {
    console.error('CRM funnel leads error:', leadsResult.error);
  }
  if (prospectsResult.error) {
    console.error('CRM funnel prospects error:', prospectsResult.error);
  }

  const leads = leadsResult.data || [];
  const prospects = prospectsResult.data || [];

  // Build stage counts for dashboard
  const LEAD_STAGES = ['new', 'contacted', 'engaged', 'link_sent', 'converted', 'cold', 'lost'];
  const PROSPECT_STAGES = ['new', 'messaged', 'replied', 'contact_collected', 'invite_sent', 'registered', 'active', 'lost', 'blocked'];

  const leadsByStage: Record<string, typeof leads> = {};
  for (const stage of LEAD_STAGES) {
    leadsByStage[stage] = leads.filter(l => l.stage === stage);
  }

  const prospectsByStage: Record<string, typeof prospects> = {};
  for (const stage of PROSPECT_STAGES) {
    prospectsByStage[stage] = prospects.filter(p => p.stage === stage);
  }

  return NextResponse.json({
    ok: true,
    leads,
    prospects,
    leadsByStage,
    prospectsByStage,
    stats: {
      totalLeads: leads.length,
      convertedLeads: leads.filter(l => l.stage === 'converted').length,
      totalProspects: prospects.length,
      registeredProspects: prospects.filter(p => p.stage === 'registered' || p.stage === 'active').length,
      activeProspects: prospects.filter(p => p.stage === 'active').length,
    },
  });
}

/**
 * PUT /api/admin/crm/funnel
 * Update stage or notes for a lead or prospect.
 */
export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    type: 'lead' | 'prospect';
    id: number;
    stage?: string;
    admin_notes?: string;
    next_followup_at?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, id, stage, admin_notes, next_followup_at } = body;
  if (!type || !id) {
    return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
  }

  const db = getServiceClient();
  const table = type === 'lead' ? 'crm_lead_funnel' : 'crm_executor_prospects';

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (stage !== undefined) updates.stage = stage;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;
  if (next_followup_at !== undefined) updates.next_followup_at = next_followup_at;

  const { error } = await db.from(table).update(updates).eq('id', id);
  if (error) {
    console.error(`PUT /api/admin/crm/funnel [${table}]:`, error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
