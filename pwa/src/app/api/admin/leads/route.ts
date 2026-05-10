import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('leads')
    .select('id, phone, work_type, city, comment, source, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    log.error('GET /api/admin/leads', { error: String(error) });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leads: data || [] });
}
