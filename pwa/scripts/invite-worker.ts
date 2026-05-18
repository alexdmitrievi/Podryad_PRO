/**
 * Invite Worker — MTProto-based Telegram channel/chat inviter.
 *
 * Usage: npx tsx scripts/invite-worker.ts
 * Needs env vars:
 *   TELEGRAM_MT_PROTO_API_ID    — from my.telegram.org
 *   TELEGRAM_MT_PROTO_API_HASH  — from my.telegram.org
 *   INVITE_ACCOUNT_PHONE        — phone of the technical account (+79...)
 *   SUPABASE_URL                — NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service_role JWT
 *
 * Rate-limits: respects invite_lists.daily_limit per list.
 * Runs as a long-lived process with 60s poll intervals.
 */

import { createClient } from '@supabase/supabase-js';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram';
import * as readline from 'readline';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const API_ID = parseInt(process.env.TELEGRAM_MT_PROTO_API_ID || '0', 10);
const API_HASH = process.env.TELEGRAM_MT_PROTO_API_HASH || '';
const PHONE = process.env.INVITE_ACCOUNT_PHONE || '';
const SESSION_FILE = 'invite-worker.session';

const POLL_INTERVAL_MS = 60_000;
const INVITE_MIN_DELAY_MS = 60_000;
const INVITE_MAX_DELAY_MS = 300_000;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function randomDelay() {
  return INVITE_MIN_DELAY_MS + Math.random() * (INVITE_MAX_DELAY_MS - INVITE_MIN_DELAY_MS);
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

let client: TelegramClient;

async function connectTelegram() {
  if (!API_ID || !API_HASH) {
    console.error('[Worker] TELEGRAM_MT_PROTO_API_ID or TELEGRAM_MT_PROTO_API_HASH not set');
    return false;
  }

  const fs = await import('fs');
  let sessionStr = '';
  try { sessionStr = fs.readFileSync(SESSION_FILE, 'utf-8'); } catch { /* no session yet */ }

  const session = new StringSession(sessionStr);
  client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
    deviceModel: 'InviteWorker',
    appVersion: '1.0.0',
  });

  try {
    await client.connect();

    if (!await client.isUserAuthorized()) {
      console.log('[Worker] Not authorized — sending code to', PHONE);
      await client.sendCode({ apiId: API_ID, apiHash: API_HASH }, PHONE);
      const code = await prompt('Enter the code you received: ');
      await client.signInUser({ apiId: API_ID, apiHash: API_HASH }, { phoneCode: () => Promise.resolve(code) } as any);

      fs.writeFileSync(SESSION_FILE, client.session.save() as unknown as string);
      console.log('[Worker] Authorized and session saved');
    } else {
      console.log('[Worker] Connected with saved session');
    }
    return true;
  } catch (err) {
    console.error('[Worker] Telegram connection error:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function getDailyInvitedCount(listId: string): Promise<number> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await db
    .from('invite_log')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('success', true)
    .gte('created_at', today);

  if (error) {
    console.error('[Worker] Count query error:', error.message);
    return 0;
  }
  return count ?? 0;
}

async function canProcessMore(listId: string, dailyLimit: number): Promise<boolean> {
  const invited = await getDailyInvitedCount(listId);
  return invited < dailyLimit;
}

async function inviteUser(
  queueId: string,
  listId: string,
  telegramId: number,
  targetId: string,
  targetType: string,
): Promise<{ success: boolean; error?: string; latencyMs: number }> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const start = Date.now();

  try {
    const peer = targetId.startsWith('-100') || targetId.startsWith('-')
      ? Number(targetId)
      : targetId;

    if (targetType === 'channel') {
      await client.invoke(new Api.channels.InviteToChannel({
        channel: peer,
        users: [telegramId],
      }));
    } else {
      await client.invoke(new Api.channels.InviteToChannel({
        channel: peer,
        users: [telegramId],
      }));
    }

    const latencyMs = Date.now() - start;
    await db.rpc('mark_invite_result', {
      p_queue_id: queueId,
      p_success: true,
      p_error_message: null,
      p_latency_ms: latencyMs,
    });

    console.log(`[Worker] Invited: ${telegramId} -> ${targetId} (${latencyMs}ms)`);
    return { success: true, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await db.rpc('mark_invite_result', {
      p_queue_id: queueId,
      p_success: false,
      p_error_message: errorMsg.slice(0, 500),
      p_latency_ms: latencyMs,
    });

    console.error(`[Worker] FAIL: ${telegramId} -> ${targetId}: ${errorMsg.slice(0, 120)}`);
    return { success: false, error: errorMsg, latencyMs };
  }
}

async function getActiveLists(): Promise<Array<{ id: string; daily_limit: number; target_id: string; target_type: string }>> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await db
    .from('invite_lists')
    .select('id, daily_limit, target_id, target_type')
    .eq('status', 'active');

  if (error) {
    console.error('[Worker] List query error:', error.message);
    return [];
  }
  return (data ?? []) as Array<{ id: string; daily_limit: number; target_id: string; target_type: string }>;
}

async function getPendingQueueItems(): Promise<Array<{
  id: string; list_id: string; telegram_id: number;
  username: string | null; first_name: string | null; last_name: string | null;
  target_id: string; target_type: string; retries: number;
}>> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await db.rpc('get_next_invite_batch', { p_limit: 3 });

  if (error) {
    console.error('[Worker] RPC error:', error.message);
    return [];
  }
  return (data ?? []) as Array<{
    id: string; list_id: string; telegram_id: number;
    username: string | null; first_name: string | null; last_name: string | null;
    target_id: string; target_type: string; retries: number;
  }>;
}

async function processOnce() {
  const items = await getPendingQueueItems();
  if (items.length === 0) return;

  const activeLists = await getActiveLists();
  const listMap = new Map(activeLists.map(l => [l.id, l]));

  console.log(`[Worker] Processing ${items.length} items...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const list = listMap.get(item.list_id);

    if (!list || !(await canProcessMore(item.list_id, list.daily_limit))) {
      console.log(`[Worker] Skipping ${item.telegram_id} — daily limit reached or list inactive`);
      continue;
    }

    await inviteUser(item.id, item.list_id, item.telegram_id, item.target_id, item.target_type);

    if (i < items.length - 1) {
      const delay = randomDelay();
      console.log(`[Worker] Waiting ${Math.round(delay / 1000)}s before next invite...`);
      await sleep(delay);
    }
  }
}

async function checkWorkerActive(): Promise<boolean> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await db
    .from('worker_control')
    .select('is_active')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[Worker] Control check error:', error.message);
    return false;
  }
  return (data as { is_active: boolean } | null)?.is_active ?? false;
}

async function main() {
  console.log('[Worker] Starting invite worker...');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[Worker] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const connected = await connectTelegram();
  if (!connected) {
    console.error('[Worker] Failed to connect to Telegram. Check API_ID, API_HASH.');
    process.exit(1);
  }

  console.log('[Worker] Polling every', POLL_INTERVAL_MS / 1000, 'seconds. Press Ctrl+C to stop.');
  console.log('[Worker] Waiting for admin to enable via panel...');

  while (true) {
    const active = await checkWorkerActive();
    if (!active) {
      if (Math.random() < 0.1) console.log('[Worker] Paused — waiting for admin start');
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    try {
      await processOnce();
    } catch (err) {
      console.error('[Worker] Process error:', err instanceof Error ? err.message : String(err));
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
