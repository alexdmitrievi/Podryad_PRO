import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('lead_id') ?? '';
  const contactId = searchParams.get('contact_id') ?? '';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

  if (!leadId && !contactId) {
    return NextResponse.json({ error: 'lead_id or contact_id required' }, { status: 400 });
  }

  const db = getServiceClient();

  let query = db.from('bot_messages')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (leadId) query = query.eq('lead_id', leadId);
  if (contactId) query = query.eq('contact_id', contactId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
