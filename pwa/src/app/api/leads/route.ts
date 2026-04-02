import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

interface LeadBody {
  phone: string;
  work_type: string;
  city?: string;
  comment?: string;
  source?: string;
}

/** Strip all non-digit characters from a phone string and return only digits. */
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  let body: LeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { phone, work_type, city, comment, source } = body;

  // Validate phone: require 10+ digits after stripping
  const digits = stripPhone(phone ?? '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  // Validate work_type
  const validWorkTypes = ['labor', 'equipment', 'materials', 'complex'];
  if (!work_type || !validWorkTypes.includes(work_type)) {
    return NextResponse.json({ error: 'invalid_work_type' }, { status: 422 });
  }

  const db = getServiceClient();

  const { error } = await db.from('leads').insert({
    phone: digits,
    work_type,
    city: city ?? 'omsk',
    comment: comment ?? null,
    source: source ?? 'landing',
  });

  if (error) {
    console.error('POST /api/leads:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Fire-and-forget webhook to n8n (never blocks response)
  const webhookUrl = process.env.N8N_LEADS_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: digits, work_type, city: city ?? 'omsk', comment, source: source ?? 'landing' }),
    }).catch((err) => {
      console.error('n8n lead webhook error (non-blocking):', err);
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
