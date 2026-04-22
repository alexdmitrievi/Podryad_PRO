import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(adminPin);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') || '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('disputes')
    .select('id, order_id, initiated_by, reason, description, resolution, resolved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('GET /api/admin/disputes:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, disputes: data || [] });
}
