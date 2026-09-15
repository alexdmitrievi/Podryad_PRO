import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

/**
 * Global stop-list (suppression list) admin CRUD.
 * GET    /api/admin/suppression?channel=&search=
 * POST   /api/admin/suppression  { channel, identifier, reason? }
 * DELETE /api/admin/suppression?id=<id>
 */
export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') || '';
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  let q = db.from('suppression_list').select('*').order('created_at', { ascending: false }).limit(500);
  if (channel) q = q.eq('channel', channel);
  if (search) q = q.ilike('identifier', `%${search}%`);

  const { data, error } = await q;
  if (error) {
    log.error('GET /api/admin/suppression', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: NextRequest) {
  let body: { channel: string; identifier: string; reason?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const channel = (body.channel || '').trim();
  const identifier = (body.identifier || '').trim();
  if (!channel || !identifier) {
    return NextResponse.json({ error: 'channel and identifier are required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { error } = await db.from('suppression_list').upsert(
    { channel, identifier: identifier.toLowerCase(), reason: body.reason || '', source: body.source || 'manual' },
    { onConflict: 'channel,identifier' },
  );
  if (error) {
    log.error('POST /api/admin/suppression', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getServiceClient();
  const { error } = await db.from('suppression_list').delete().eq('id', id);
  if (error) {
    log.error('DELETE /api/admin/suppression', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
