import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

/**
 * POST /api/crm/update-stage
 * Internal webhook called from the app when a conversion event happens.
 * Protected by a shared secret, NOT admin PIN.
 *
 * Body:
 * {
 *   event: 'order_created' | 'contractor_registered' | 'order_taken',
 *   phone: string,
 *   entity_id?: string,  // order ID or contractor ID
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

  // Validate secret
  const expectedSecret = process.env.CRM_WEBHOOK_SECRET;
  if (!expectedSecret || body.secret !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { event, phone, entity_id, entity_type } = body;

  if (!event || !phone) {
    return NextResponse.json({ error: 'event and phone are required' }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, '');

  // Fire-and-forget to n8n conversion tracker
  const n8nWebhook = process.env.N8N_CRM_CONVERSION_WEBHOOK_URL;
  if (n8nWebhook) {
    fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        phone: cleanPhone,
        entity_id,
        entity_type,
      }),
    }).catch((err) => {
      console.error('CRM conversion n8n webhook error:', err);
    });
  }

  // Also update Supabase directly for immediate consistency
  const db = getServiceClient();
  const now = new Date().toISOString();

  if (event === 'order_created') {
    // Update customer lead funnel
    await db
      .from('crm_lead_funnel')
      .update({ stage: 'converted', converted_at: now, order_id: entity_id, updated_at: now })
      .eq('phone', cleanPhone)
      .neq('stage', 'converted');
  } else if (event === 'contractor_registered') {
    // Update executor prospect
    await db
      .from('crm_executor_prospects')
      .update({ stage: 'registered', registered_at: now, contractor_id: entity_id, updated_at: now })
      .eq('phone', cleanPhone)
      .neq('stage', 'active');
  } else if (event === 'order_taken') {
    // Mark executor as active
    await db
      .from('crm_executor_prospects')
      .update({ stage: 'active', first_order_at: now, updated_at: now })
      .eq('phone', cleanPhone)
      .eq('stage', 'registered');
  }

  return NextResponse.json({ ok: true });
}
