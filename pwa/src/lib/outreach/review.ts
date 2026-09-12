/**
 * Outreach review flow (Autoclient MVP, Block 3).
 *
 * Draft proposals created by Parser's CrmBridge (outreach_tasks.status='draft')
 * are pushed to the owner's Telegram chat with OK / Edit / Reject buttons.
 * Approved tasks stay in status 'approved' until the send step (Coldy, Block 4).
 * Nothing is ever sent to a lead without the owner's explicit approval.
 */

import { getServiceClient } from '@/lib/supabase';
import { getChannelRouter } from '@/lib/channels';
import { getLLMConfig } from '@/lib/ai/config';
import { log } from '@/lib/logger';

export const REVIEW_STATUS = 'in_review';

const EDIT_FUNNEL = 'outreach_edit';

export interface OutreachTaskRow {
  id: number;
  lead_id: number;
  channel: string;
  status: string;
  subject: string;
  body: string;
  to_address: string;
}

export type OutreachAction = 'approve' | 'reject' | 'edit';

export function getAdminChatId(): string | null {
  return process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID || null;
}

/** Parse `outreach:<action>:<taskId>` callback_data. Returns null for anything else. */
export function parseOutreachCallback(data: string): { action: OutreachAction; taskId: number } | null {
  const m = /^outreach:(approve|reject|edit):(\d+)$/.exec(data.trim());
  if (!m) return null;
  return { action: m[1] as OutreachAction, taskId: Number(m[2]) };
}

/** Buttons in tgSend format ({text, data}). */
export function reviewButtons(taskId: number): Array<Array<{ text: string; data: string }>> {
  return [[
    { text: '✅ ОК', data: `outreach:approve:${taskId}` },
    { text: '✏️ Правка', data: `outreach:edit:${taskId}` },
    { text: '❌ Отклонить', data: `outreach:reject:${taskId}` },
  ]];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const MAX_BODY_PREVIEW = 1500;

export function buildReviewMessage(
  task: Pick<OutreachTaskRow, 'id' | 'subject' | 'body' | 'to_address'>,
  companyName: string,
  niche?: string,
): string {
  const body = task.body.length > MAX_BODY_PREVIEW
    ? `${task.body.slice(0, MAX_BODY_PREVIEW)}…`
    : task.body;
  const lines = [
    `📨 <b>Черновик КП #${task.id}</b>`,
    `🏢 ${escapeHtml(companyName || '—')}${niche ? ` (${escapeHtml(niche)})` : ''}`,
    `✉️ Кому: ${escapeHtml(task.to_address || '—')}`,
    '',
    `<b>Тема:</b> ${escapeHtml(task.subject)}`,
    '',
    escapeHtml(body),
    '',
    '— ✅ ОК → в очередь на отправку; ✏️ Правка → перегенерация; ❌ → skipped',
  ];
  return lines.join('\n');
}

/** Parse LLM answer in the `subject|||body` format (same contract as Parser). */
export function parseProposalAnswer(answer: string, fallbackSubject: string): { subject: string; body: string } {
  if (answer.includes('|||')) {
    const [subject, body] = answer.split('|||', 2);
    return { subject: subject.trim() || fallbackSubject, body: body.trim() };
  }
  return { subject: fallbackSubject, body: answer.trim() };
}

interface LeadJoin {
  niche?: string;
  companyName?: string;
}

async function fetchLeadJoins(leadIds: number[]): Promise<Map<number, LeadJoin>> {
  const map = new Map<number, LeadJoin>();
  if (!leadIds.length) return map;
  const db = getServiceClient();
  const { data: leads } = await db
    .from('crm_leads')
    .select('id, company_id, niche')
    .in('id', leadIds);
  const companyIds = (leads ?? []).map((l) => l.company_id).filter(Boolean);
  const { data: companies } = companyIds.length
    ? await db
        .from('leads_companies')
        .select('id, company_name_en, company_name_zh, country, city')
        .in('id', companyIds)
    : { data: [] as Array<Record<string, unknown>> };
  for (const lead of leads ?? []) {
    const company = (companies ?? []).find((c) => c.id === lead.company_id);
    const name = company
      ? String(company.company_name_en || company.company_name_zh || '')
      : '';
    const geo = company
      ? [company.city, company.country].filter(Boolean).join(', ')
      : '';
    map.set(lead.id, { niche: lead.niche ?? '', companyName: [name, geo].filter(Boolean).join(' — ') });
  }
  return map;
}

/**
 * Push up to `limit` draft tasks to the owner's Telegram with review buttons.
 * Tasks are marked 'in_review' so the next cron tick does not resend them.
 */
export async function sendDraftsForReview(limit = 5): Promise<number> {
  const adminChatId = getAdminChatId();
  if (!adminChatId) {
    log.warn('[outreach-review] TELEGRAM_ADMIN_CHAT_ID not set');
    return 0;
  }
  const db = getServiceClient();
  const { data: tasks, error } = await db
    .from('outreach_tasks')
    .select('id, lead_id, channel, status, subject, body, to_address')
    .eq('status', 'draft')
    .order('id', { ascending: true })
    .limit(limit);
  if (error) {
    log.error('[outreach-review] fetch drafts failed', { error: String(error) });
    return 0;
  }
  if (!tasks?.length) return 0;

  const joins = await fetchLeadJoins(tasks.map((t) => t.lead_id));
  const router = getChannelRouter();
  let sent = 0;
  for (const task of tasks as OutreachTaskRow[]) {
    const join = joins.get(task.lead_id);
    const res = await router.send({
      channel: 'telegram',
      chat_id: adminChatId,
      text: buildReviewMessage(task, join?.companyName ?? '', join?.niche),
      buttons: [[
        { type: 'callback', text: '✅ ОК', callback_data: `outreach:approve:${task.id}` },
        { type: 'callback', text: '✏️ Правка', callback_data: `outreach:edit:${task.id}` },
        { type: 'callback', text: '❌ Отклонить', callback_data: `outreach:reject:${task.id}` },
      ]],
    });
    if (res.success) {
      // Guard on current status so a race with a manual edit never downgrades it
      await db.from('outreach_tasks').update({ status: REVIEW_STATUS }).eq('id', task.id).eq('status', 'draft');
      sent += 1;
    } else {
      log.error('[outreach-review] send failed', { taskId: task.id, error: res.error });
    }
  }
  return sent;
}

/** Approve / Reject a task. Returns a user-facing message for the bot reply. */
export async function handleOutreachAction(
  action: Exclude<OutreachAction, 'edit'>,
  taskId: number,
): Promise<{ ok: boolean; message: string }> {
  const db = getServiceClient();
  const { data: task } = await db
    .from('outreach_tasks')
    .select('id, status')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return { ok: false, message: `⚠️ Задача #${taskId} не найдена.` };

  const next = action === 'approve' ? 'approved' : 'skipped';
  if (!['draft', REVIEW_STATUS].includes(String(task.status))) {
    return { ok: false, message: `ℹ️ Задача #${taskId} уже в статусе «${task.status}» — действие не требуется.` };
  }
  const { error } = await db
    .from('outreach_tasks')
    .update({ status: next })
    .eq('id', taskId)
    .in('status', ['draft', REVIEW_STATUS]);
  if (error) return { ok: false, message: `⚠️ Ошибка обновления #${taskId}.` };
  return {
    ok: true,
    message: action === 'approve'
      ? `✅ КП #${taskId} одобрено и встанет в очередь на отправку.`
      : `❌ КП #${taskId} отклонено (skipped).`,
  };
}

// ── Edit state (bot_sessions) ───────────────────────────────────────────────

export async function setOutreachEditState(chatId: string, taskId: number): Promise<void> {
  const db = getServiceClient();
  await db.rpc('get_or_create_bot_session', {
    p_chat_id: chatId,
    p_channel: 'telegram',
    p_contact_id: null,
  });
  await db.rpc('update_bot_session', {
    p_chat_id: chatId,
    p_channel: 'telegram',
    p_funnel: EDIT_FUNNEL,
    p_step: String(taskId),
    p_state: JSON.stringify({ screen: EDIT_FUNNEL, task_id: taskId }),
  });
}

/** Task id if this chat is awaiting an edit instruction, else null. */
export async function getOutreachEditTaskId(chatId: string): Promise<number | null> {
  const db = getServiceClient();
  const { data } = await db
    .from('bot_sessions')
    .select('funnel, step')
    .eq('chat_id', chatId)
    .eq('channel', 'telegram')
    .maybeSingle();
  if (data?.funnel !== EDIT_FUNNEL) return null;
  const taskId = Number(data.step);
  return Number.isFinite(taskId) && taskId > 0 ? taskId : null;
}

export async function clearOutreachEditState(chatId: string): Promise<void> {
  const db = getServiceClient();
  await db.rpc('update_bot_session', {
    p_chat_id: chatId,
    p_channel: 'telegram',
    p_funnel: 'home',
    p_step: 'start',
    p_state: JSON.stringify({ screen: 'home' }),
  });
}

// ── LLM regeneration ────────────────────────────────────────────────────────

function buildRegenPrompt(task: OutreachTaskRow, companyName: string, instruction: string): string {
  return (
    'Ты — копирайтер B2B-агентства «Подряд PRO» (лидогенерация как сервис). ' +
    'Перепиши черновик холодного коммерческого предложения с учётом правки владельца.\n\n' +
    `Компания-получатель: ${companyName || '—'}\n` +
    `Текущая тема: ${task.subject}\n` +
    `Текущий текст:\n${task.body}\n\n` +
    `Правка владельца: ${instruction}\n\n` +
    'Требования: деловой тон, 3–4 абзаца, один вопрос-призыв в конце, ' +
    'обязательна строка отписки на языке письма. Язык письма сохрани. ' +
    "Верни ровно две части: сначала тема письма, затем '|||', затем текст письма."
  );
}

export interface RegenResult {
  ok: boolean;
  error?: string;
  task?: OutreachTaskRow;
  companyName?: string;
  niche?: string;
}

/** Regenerate a draft with the owner's edit instruction via the configured LLM. */
export async function regenerateDraft(taskId: number, instruction: string): Promise<RegenResult> {
  const db = getServiceClient();
  const { data: task } = await db
    .from('outreach_tasks')
    .select('id, lead_id, channel, status, subject, body, to_address')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: `задача #${taskId} не найдена` };
  if (!['draft', REVIEW_STATUS].includes(String(task.status))) {
    return { ok: false, error: `задача #${taskId} уже в статусе «${task.status}»` };
  }

  const cfg = getLLMConfig();
  if (!cfg.apiKey) {
    return { ok: false, error: 'LLM не настроен (LLM_API_KEY/OPENAI_API_KEY отсутствует)' };
  }

  const joins = await fetchLeadJoins([task.lead_id]);
  const join = joins.get(task.lead_id);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(cfg.timeout, 30000));
  try {
    const res = await fetch(`${cfg.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: buildRegenPrompt(task as OutreachTaskRow, join?.companyName ?? '', instruction) }],
        max_tokens: cfg.maxTokens,
        temperature: cfg.temperature,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errorText = await res.text();
      log.error('[outreach-review] LLM error', { status: res.status, error: errorText.slice(0, 300) });
      return { ok: false, error: `LLM API error ${res.status}` };
    }
    const json = await res.json();
    const answer: string = json.choices?.[0]?.message?.content ?? '';
    if (!answer.trim()) return { ok: false, error: 'LLM вернул пустой ответ' };

    const parsed = parseProposalAnswer(answer, (task as OutreachTaskRow).subject);
    const { error: updateError } = await db
      .from('outreach_tasks')
      .update({ subject: parsed.subject, body: parsed.body })
      .eq('id', taskId)
      .in('status', ['draft', REVIEW_STATUS]);
    if (updateError) return { ok: false, error: 'не удалось сохранить новый черновик' };

    return {
      ok: true,
      task: { ...(task as OutreachTaskRow), subject: parsed.subject, body: parsed.body },
      companyName: join?.companyName,
      niche: join?.niche,
    };
  } catch (err) {
    log.error('[outreach-review] regenerate failed', { error: String(err) });
    return { ok: false, error: String(err instanceof Error ? err.message : err) };
  } finally {
    clearTimeout(timer);
  }
}
