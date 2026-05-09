// Bot loyalty and referral logic
import { rpc } from './supabase';

export async function ensureReferralCode(contactId: string): Promise<string> {
  const data = await rpc<string>('ensure_referral_code', { p_contact_id: contactId });
  return String(data);
}

export async function recordReferralVisit(
  inviteeContactId: string,
  code: string,
): Promise<string | null> {
  const data = await rpc<string | null>('record_referral_visit', {
    p_invitee_contact_id: inviteeContactId,
    p_code: code,
  });
  return data ?? null;
}

export async function getReferralLink(contactId: string, botName = 'PodraydPRO_bot'): Promise<string> {
  const code = await ensureReferralCode(contactId);
  return `https://t.me/${botName}?start=ref_${code}`;
}

export async function getReferralStats(contactId: string): Promise<{
  invited: number;
  qualified: number;
  balance: number;
}> {
  const { getServiceClient } = await import('@/lib/supabase');
  const db = () => getServiceClient();

  const [{ data: invited }, { data: balance }] = await Promise.all([
    db()
      .from('referrals')
      .select('id, status')
      .eq('referrer_contact_id', contactId),
    db()
      .from('loyalty_balances')
      .select('bonus_rub')
      .eq('contact_id', contactId)
      .maybeSingle(),
  ]);

  const list = (invited ?? []) as Array<{ status: string }>;
  return {
    invited: list.length,
    qualified: list.filter((r) => r.status === 'qualified').length,
    balance: ((balance as { bonus_rub: number } | null)?.bonus_rub) ?? 0,
  };
}
