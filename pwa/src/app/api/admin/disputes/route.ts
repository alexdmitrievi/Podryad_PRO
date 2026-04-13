import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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
