import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

/** GET — list all executor responses (admin only) */
export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('executor_responses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    log.error('GET /api/admin/responses', { error: String(error) });
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ responses: data || [] });
}

/** PUT — update response status (accept/reject) */
export async function PUT(req: NextRequest) {
  let body: { id: number; status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const validStatuses = ['pending', 'accepted', 'rejected'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 422 });
  }

  if (!body.id || typeof body.id !== 'number') {
    return NextResponse.json({ error: 'invalid_id' }, { status: 422 });
  }

  const db = getServiceClient();
  const { error } = await db
    .from('executor_responses')
    .update({ status: body.status })
    .eq('id', body.id);

  if (error) {
    log.error('PUT /api/admin/responses', { error: String(error) });
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
