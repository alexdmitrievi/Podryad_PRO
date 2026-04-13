import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  let body: { name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!name || !phone) {
    return NextResponse.json({ error: 'name and phone required' }, { status: 400 });
  }

  const db = getServiceClient();

  // Get or create customer token
  const { data: existing } = await db
    .from('customer_tokens')
    .select('access_token')
    .eq('phone', phone)
    .single();

  let token: string;
  if (existing) {
    token = existing.access_token;
  } else {
    const { data: created, error } = await db
      .from('customer_tokens')
      .insert({ phone })
      .select('access_token')
      .single();

    if (error) {
      console.error('POST /api/admin/generate-link:', error);
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }
    token = created.access_token;
  }

  const host = req.headers.get('host') || 'podryad.pro';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const link = `${proto}://${host}/my/${token}`;

  return NextResponse.json({ ok: true, link, token });
}
