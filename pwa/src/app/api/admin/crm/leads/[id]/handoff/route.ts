import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getChannelRouter } from '@/lib/channels';
import { getAdminChatId } from '@/lib/outreach/review';
import { log } from '@/lib/logger';

/**
 * POST /api/admin/crm/leads/[id]/handoff
 * «Перехватить» — владелец берёт лида в ручную работу: статус → 'call',
 * контекст уходит в TG админу.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!leadId) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const db = getServiceClient();
  const { data: lead, error } = await db.from('crm_leads').select('*').eq('id', leadId).single();
  if (error || !lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: company } = await db.from('leads_companies').select('company_name_en, company_name_zh, website, domain, city').eq('id', lead.company_id).single();

  await db.from('crm_leads').update({ status: 'call', updated_at: new Date().toISOString() }).eq('id', leadId);

  const chatId = getAdminChatId();
  if (chatId) {
    const name = company?.company_name_en || company?.company_name_zh || company?.domain || `#${leadId}`;
    const text = [
      `🤝 *Перехват лида*`,
      ``,
      `🏢 ${name}`,
      `🌐 ${company?.website || company?.domain || '—'}`,
      `📍 ${company?.city || '—'}`,
      `🧭 Ниша: ${lead.niche || '—'}`,
      ``,
      `⚡ Свяжитесь с лидом вручную (email/мессенджер).`,
    ].join('\n');
    try {
      const router = getChannelRouter();
      await router.send({ channel: 'telegram', chat_id: chatId, text });
    } catch (e) {
      log.error('handoff notify failed', { error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, status: 'call' });
}
