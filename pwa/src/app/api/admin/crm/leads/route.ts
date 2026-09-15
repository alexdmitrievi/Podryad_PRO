import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

export const CRM_STATUSES = ['new', 'analyzed', 'cp_drafted', 'cp_approved', 'sent', 'replied', 'call', 'won', 'lost'] as const;

/**
 * GET /api/admin/crm/leads?status=&channel=&search=&limit=&offset=
 * Autoclient CRM list + funnel counts, joined with company info.
 */
export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const channel = searchParams.get('channel') || '';
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get('limit') || 200), 500);
  const offset = Number(searchParams.get('offset') || 0);

  let q = db
    .from('crm_leads')
    .select('*')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq('status', status);
  if (channel) q = q.eq('channel', channel);

  const { data: leads, error } = await q;
  if (error) {
    log.error('GET /api/admin/crm/leads', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const rows = leads || [];
  let rowsFiltered = rows;

  // Company join + search filter
  const companyIds = rows.map((l) => l.company_id);
  const { data: companies } = companyIds.length
    ? await db.from('leads_companies').select('*').in('id', companyIds)
    : { data: [] };
  const byId = new Map((companies || []).map((c) => [c.id, c]));

  const joined = rows.map((l) => ({
    ...l,
    company: byId.get(l.company_id) || null,
  }));

  if (search) {
    rowsFiltered = joined.filter((l) => {
      const c = l.company || {};
      return [c.company_name_en, c.company_name_zh, c.domain, c.website, c.city, l.niche]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(search));
    });
  }

  // Funnel counts (full table, cheap)
  const { data: all } = await db.from('crm_leads').select('status');
  const funnel: Record<string, number> = {};
  for (const s of CRM_STATUSES) funnel[s] = 0;
  for (const r of all || []) if (r.status in funnel) funnel[r.status] += 1;

  return NextResponse.json({ ok: true, leads: rowsFiltered, funnel, total: (all || []).length });
}
