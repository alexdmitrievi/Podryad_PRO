import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { enqueueJob } from '@/lib/job-queue';

interface CatalogOrderBody {
  item_id: string;
  item_title: string;
  contact_method: 'phone' | 'telegram';
  contact_value: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = await checkRateLimit(`catalog-order:${ip}`, 15, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: CatalogOrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { item_id, item_title, contact_method, contact_value } = body;

  if (!item_id || !item_title || !contact_method || !contact_value?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
  }

  const validMethods = ['phone', 'telegram'];
  if (!validMethods.includes(contact_method)) {
    return NextResponse.json({ error: 'invalid_contact_method' }, { status: 422 });
  }

  const db = getServiceClient();

  // Store as a lead with enriched comment
  const contactLabel =
    contact_method === 'phone' ? 'Телефон' :
    'Telegram';

  const comment = `Каталог: ${item_title} (${item_id}) | ${contactLabel}: ${contact_value.trim()}`;

  // Determine work_type from item_id prefix
  let work_type = 'complex';
  if (item_id.startsWith('l-')) work_type = 'labor';
  else if (item_id.startsWith('f-m')) work_type = 'materials';
  else work_type = 'equipment';

  // For phone contacts, store the phone; for others, use a placeholder
  const phone = contact_method === 'phone' ? contact_value.trim().replace(/\D/g, '') : '0000000000';

  const { error } = await db.from('leads').insert({
    phone,
    work_type,
    city: 'omsk',
    comment,
    source: 'catalog',
  });

  if (error) {
    console.error('POST /api/catalog-orders:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  void enqueueJob({
    queueName: 'notifications',
    jobType: 'notify.lead_created',
    dedupeKey: `notify.lead_created:catalog:${phone}:${Date.now()}`,
    payload: {
      phone,
      work_type,
      city: 'omsk',
      comment,
      source: 'catalog',
      contact_method,
      contact_value: contact_value.trim(),
      item_title,
    },
  }).catch((err) => {
    console.error('enqueueJob notify.lead_created catalog error (non-blocking):', err);
  });

  // Nurture chain — only for real phone contacts (Telegram contacts handled manually)
  if (contact_method === 'phone') {
    const catalogNow = Date.now();
    for (const [stepKey, delay] of [['welcome', 0], ['followup_2h', 2], ['followup_24h', 24], ['followup_72h', 72]] as const) {
      void enqueueJob({
        queueName: 'crm',
        jobType: 'crm.customer_nurture_step',
        dedupeKey: `nurture:${stepKey}:catalog:${phone}`,
        runAt: new Date(catalogNow + (delay as number) * 60 * 60 * 1000).toISOString(),
        payload: { phone, work_type, step: stepKey, item_title },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
