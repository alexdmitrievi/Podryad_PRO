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

/** GET — list all executor responses (admin only) */
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('executor_responses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('GET /api/admin/responses:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ responses: data || [] });
}

/** PUT — update response status (accept/reject) */
export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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
    console.error('PUT /api/admin/responses:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
