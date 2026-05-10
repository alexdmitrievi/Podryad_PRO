import { NextRequest, NextResponse } from 'next/server';
import { getContractors, updateContractor } from '@/lib/db';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const contractors = await getContractors();
    return NextResponse.json({ ok: true, contractors });
  } catch (err) {
    log.error('GET /api/admin/contractors', { error: String(err) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: { id: string; status?: string; admin_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, status, admin_notes } = body;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;

  try {
    await updateContractor(id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('PUT /api/admin/contractors', { error: String(err) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
