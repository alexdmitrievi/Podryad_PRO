import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

function verifySecret(secret: string): boolean {
  const expected = process.env.CRM_WEBHOOK_SECRET;
  if (!expected) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/crm/update-stage
 * Internal webhook called from the app when a conversion event happens.
 * Protected by a shared secret (CRM_WEBHOOK_SECRET), NOT admin PIN.
 *
 * Body:
 * {
 *   event: 'order_created' | 'contractor_registered' | 'order_taken',
 *   phone: string,
 *   entity_id?: string,
 *   entity_type?: string,
 *   secret: string,
 * }
 */
export async function POST(req: NextRequest) {
  let body: {
    event: string;
    phone: string;
    entity_id?: string;
    entity_type?: string;
    secret?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!verifySecret(body.secret ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { event, phone, entity_id, entity_type } = body;

  if (!event || !phone) {
    return NextResponse.json({ error: 'event and phone are required' }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, '');

  // Update Supabase directly for immediate consistency
  const db = getServiceClient();
  const now = new Date().toISOString();

  if (event === 'order_created') {
    const { error } = await db
      .from('crm_lead_funnel')
      .update({ stage: 'converted', converted_at: now, order_id: entity_id, updated_at: now })
      .eq('phone', cleanPhone)
      .neq('stage', 'converted');
    if (error) log.error('CRM update-stage order_created', { error: String(error) });
  } else if (event === 'contractor_registered') {
    const { error } = await db
      .from('crm_executor_prospects')
      .update({ stage: 'registered', registered_at: now, contractor_id: entity_id, updated_at: now })
      .eq('phone', cleanPhone)
      .neq('stage', 'active');
    if (error) log.error('CRM update-stage contractor_registered', { error: String(error) });
  } else if (event === 'order_taken') {
    const { error } = await db
      .from('crm_executor_prospects')
      .update({ stage: 'active', first_order_at: now, updated_at: now })
      .eq('phone', cleanPhone)
      .eq('stage', 'registered');
    if (error) log.error('CRM update-stage order_taken', { error: String(error) });
  }

  return NextResponse.json({ ok: true });
}
