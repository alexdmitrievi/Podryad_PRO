// Bot order flow — creates leads and orders from the bot funnel
import { rpc } from './supabase';
import { getServiceClient } from '@/lib/supabase';
import type { BotServiceKind } from './types';
import { estimatePriceRange, applyDiscountToRange } from './funnel-state';

export type ChannelName = 'telegram' | 'max';

export async function getBotContact(
  channel: ChannelName,
  externalId: string,
  username?: string,
  displayName?: string,
): Promise<{ contactId: string; identityId: string; isNew: boolean }> {
  const results = await rpc<{
    contact_id: string;
    identity_id: string;
    is_new: boolean;
  }>('upsert_bot_contact_by_identity', {
    p_channel: channel,
    p_external_id: externalId,
    p_username: username ?? null,
    p_display_name: displayName ?? null,
  });

  // RPC returns an array-like or single row
  const row = Array.isArray(results) ? results[0] : results;
  return {
    contactId: (row as Record<string, string>).contact_id,
    identityId: (row as Record<string, string>).identity_id,
    isNew: Boolean((row as Record<string, unknown>).is_new),
  };
}

export async function createBotLead(params: {
  contactId: string;
  serviceKind: BotServiceKind;
  channel: ChannelName;
  description?: string;
  areaValue?: number;
  areaUnit?: string;
  district?: string;
  discountPercent?: number;
  discountRub?: number;
}): Promise<string> {
  const leadId = await rpc<string>('create_bot_lead', {
    p_contact_id: params.contactId,
    p_service_kind: params.serviceKind,
    p_channel: params.channel,
    p_description: params.description ?? null,
    p_area_value: params.areaValue ?? null,
    p_area_unit: params.areaUnit ?? null,
    p_district: params.district ?? null,
    p_discount_percent: params.discountPercent ?? 0,
    p_discount_rub: params.discountRub ?? 0,
  });
  return String(leadId);
}

export async function computeDiscount(contactId: string): Promise<{
  percent: number;
  bonusRub: number;
}> {
  const data = await rpc<{ percent: number; rub_bonus: number }>('compute_discount_for_contact', {
    p_contact_id: contactId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return {
    percent: (row as Record<string, number> | null)?.percent ?? 0,
    bonusRub: (row as Record<string, number> | null)?.rub_bonus ?? 0,
  };
}

const PER_ORDER_BONUS_CAP = 500;

export async function applyDiscountToLead(
  contactId: string,
  leadId: string,
  percent: number,
  bonusRub: number,
): Promise<{ usedBonus: number }> {
  const db = () => getServiceClient();
  let usedBonus = 0;
  if (bonusRub > 0) {
    const { data, error } = await db().rpc('spend_bonus', {
      p_contact_id: contactId,
      p_amount: Math.min(bonusRub, PER_ORDER_BONUS_CAP),
      p_lead_id: leadId,
    });
    if (error) throw error;
    usedBonus = (data as number) ?? 0;
  }
  const { error: e2 } = await db()
    .from('bot_leads')
    .update({
      discount_percent: percent,
      discount_rub: usedBonus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);
  if (e2) throw e2;
  return { usedBonus };
}

export async function getPriceEstimate(
  serviceKind: BotServiceKind,
  areaValue: number,
): Promise<{ low: number; high: number }> {
  return estimatePriceRange(serviceKind, areaValue || 1);
}

export async function getMyBotOrders(contactId: string): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await getServiceClient()
    .from('v_my_bot_orders')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function getBotOrder(contactId: string, leadId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getServiceClient()
    .from('v_my_bot_orders')
    .select('*')
    .eq('contact_id', contactId)
    .eq('id', leadId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Record<string, unknown> | null;
}

export async function cancelBotOrder(contactId: string, leadId: string): Promise<boolean> {
  const db = () => getServiceClient();
  const { data: lead, error: e1 } = await db()
    .from('bot_leads')
    .select('id, status, contact_id')
    .eq('id', leadId)
    .maybeSingle();
  if (e1) throw e1;
  if (!lead || (lead as Record<string, unknown>).contact_id !== contactId) return false;

  const status = (lead as Record<string, string>).status;
  if (!['new', 'qualifying', 'qualified', 'quoted', 'scheduled'].includes(status)) return false;

  const { error: e2 } = await db().rpc('set_bot_lead_status', {
    p_lead_id: leadId,
    p_status: 'lost',
    p_actor: 'user',
  });
  if (e2) throw e2;

  await db().rpc('refund_bonus', { p_lead_id: leadId });
  return true;
}

export async function updateBotOrderDate(
  contactId: string,
  leadId: string,
  dateFrom: string,
  dateTo: string,
): Promise<boolean> {
  const db = () => getServiceClient();
  const { data: lead } = await db()
    .from('bot_leads')
    .select('id, contact_id, status')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead || (lead as Record<string, unknown>).contact_id !== contactId) return false;

  const { error } = await db()
    .from('bot_leads')
    .update({
      desired_date_from: dateFrom,
      desired_date_to: dateTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);
  if (error) throw error;
  return true;
}

export async function repeatBotOrder(
  contactId: string,
  oldLeadId: string,
  channel: ChannelName,
  whenRange: { from: string; to: string; human: string },
): Promise<{ newLeadId: string; oldOrder: Record<string, unknown> }> {
  const old = await getBotOrder(contactId, oldLeadId);
  if (!old) throw new Error('lead not found');

  const db = () => getServiceClient();
  const { data: leadId, error } = await db().rpc('create_bot_lead', {
    p_contact_id: contactId,
    p_service_kind: old.service_kind as BotServiceKind,
    p_channel: channel,
    p_area_value: old.area_value ?? null,
    p_area_unit: old.area_unit ?? null,
    p_district: old.district ?? null,
    p_metadata: { repeat_of: oldLeadId, when_label_human: whenRange.human },
  });
  if (error) throw error;

  const newLeadId = leadId as string;
  await db()
    .from('bot_leads')
    .update({
      repeat_of: oldLeadId,
      desired_date_from: whenRange.from,
      desired_date_to: whenRange.to,
    })
    .eq('id', newLeadId);

  return { newLeadId, oldOrder: old };
}
