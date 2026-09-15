import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { CRM_STATUSES } from '@/lib/crm-leads';

/**
 * Card for a single Autoclient CRM lead:
 * lead + company + decision makers + outreach tasks + messages + ai tasks.
 * GET    /api/admin/crm/leads/[id]
 * PATCH  /api/admin/crm/leads/[id]  { status?, admin_notes? }
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!leadId) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const db = getServiceClient();
  const { data: lead, error } = await db.from('crm_leads').select('*').eq('id', leadId).single();
  if (error || !lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [companyRes, dmRes, tasksRes, msgsRes, aiRes] = await Promise.all([
    db.from('leads_companies').select('*').eq('id', lead.company_id).single(),
    db.from('decision_makers').select('*').eq('company_id', lead.company_id).order('id', { ascending: true }),
    db.from('outreach_tasks').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
    db.from('lead_messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
    db.from('ai_tasks').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(10),
  ]);

  return NextResponse.json({
    ok: true,
    lead,
    company: companyRes.data || null,
    decision_makers: dmRes.data || [],
    tasks: tasksRes.data || [],
    messages: msgsRes.data || [],
    ai_tasks: aiRes.data || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!leadId) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  let body: { status?: string; admin_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!CRM_STATUSES.includes(body.status as (typeof CRM_STATUSES)[number])) {
      return NextResponse.json({ error: 'invalid status' }, { status: 422 });
    }
    patch.status = body.status;
  }
  if (body.admin_notes !== undefined) patch.admin_notes = body.admin_notes;

  const db = getServiceClient();
  const { error } = await db.from('crm_leads').update(patch).eq('id', leadId);
  if (error) {
    log.error('PATCH /api/admin/crm/leads/[id]', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
