import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getContractors, updateContractor } from '@/lib/db';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const contractors = await getContractors();
    return NextResponse.json({ ok: true, contractors });
  } catch (err) {
    console.error('GET /api/admin/contractors:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
    console.error('PUT /api/admin/contractors:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
