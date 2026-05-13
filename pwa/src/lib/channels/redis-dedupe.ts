/**
 * Distributed deduplication + processing locks via Upstash Redis.
 *
 * Why Redis (not in-memory Map):
 *   Vercel serverless runs multiple isolated function instances.
 *   An in-memory Map is per-instance — two concurrent invocations with
 *   the same update_id see separate Maps → duplicate processing.
 *   Upstash Redis ensures ALL instances share one dedupe state.
 *
 * Two-phase protocol:
 *   1. Processing Lock (SET NX EX) — prevents concurrent duplicate processing
 *   2. Processed Marker (SET EX)   — recorded ONLY after success
 *
 * Lock lifecycle (happy path):
 *   acquire → processMessage() → markProcessed (lock auto-cleaned)
 *
 * Lock lifecycle (failure path):
 *   acquire → processMessage() throws → releaseLock → Telegram retries
 *
 * In-memory fallback (no Upstash configured):
 *   Falls back to per-instance LRU Map with the SAME two-phase semantics.
 *   Safe default: never drop a message, at worst double-process.
 */

import { log } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/*  Upstash Redis REST helpers (same pattern as lib/rate-limit.ts)    */
/* ------------------------------------------------------------------ */

function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand(cmd: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL as string;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const PROCESSING_LOCK_TTL = 45; // seconds — > worst-case processMessage (30s maxDuration + margin)
const DEDUPE_TTL = 3600;        // seconds — 1 hour, matches old in-memory TTL

function dedupeKey(channel: string, updateId: string): string {
  return `dedupe:${channel}:${updateId}`;
}

function lockKey(channel: string, updateId: string): string {
  return `lock:${channel}:${updateId}`;
}

/* ------------------------------------------------------------------ */
/*  Redis-backed distributed implementation                           */
/* ------------------------------------------------------------------ */

/**
 * Check whether an update has already been successfully processed.
 * READ-ONLY — does NOT record anything. Recording happens in markUpdateProcessed().
 */
export async function isUpdateProcessed(channel: string, updateId: string): Promise<boolean> {
  if (!hasUpstash()) return isUpdateProcessedMemory(channel, updateId);
  try {
    const result = await upstashCommand(['EXISTS', dedupeKey(channel, updateId)]);
    return result === 1;
  } catch (err) {
    log.error('[RedisDedupe] EXISTS failed, falling back to in-memory', { error: String(err) });
    return isUpdateProcessedMemory(channel, updateId);
  }
}

/**
 * Atomically acquire a processing lock.
 * Returns true if lock was acquired, false if another worker is already processing.
 * Auto-expires after PROCESSING_LOCK_TTL to prevent deadlocks.
 */
export async function tryAcquireProcessingLock(channel: string, updateId: string): Promise<boolean> {
  if (!hasUpstash()) return tryAcquireProcessingLockMemory(channel, updateId);
  try {
    const result = await upstashCommand([
      'SET', lockKey(channel, updateId), '1',
      'NX', 'EX', String(PROCESSING_LOCK_TTL),
    ]);
    return result === 'OK';
  } catch (err) {
    log.error('[RedisDedupe] SET NX failed, falling back to in-memory', { error: String(err) });
    return tryAcquireProcessingLockMemory(channel, updateId);
  }
}

/**
 * Release the processing lock after a failure.
 * Allows Telegram's retry to pick up the message instead of losing it.
 */
export async function releaseProcessingLock(channel: string, updateId: string): Promise<void> {
  if (!hasUpstash()) { releaseProcessingLockMemory(channel, updateId); return; }
  try {
    await upstashCommand(['DEL', lockKey(channel, updateId)]);
  } catch (err) {
    log.error('[RedisDedupe] DEL lock failed', { error: String(err) });
  }
}

/**
 * Record that an update has been successfully processed.
 * Called ONLY after processMessage() completes successfully.
 * Combined: SET dedupe marker + DEL lock (atomic cleanup).
 */
export async function markUpdateProcessed(channel: string, updateId: string): Promise<void> {
  if (!hasUpstash()) { markUpdateProcessedMemory(channel, updateId); return; }
  try {
    await upstashCommand([
      'SET', dedupeKey(channel, updateId), String(Date.now()),
      'EX', String(DEDUPE_TTL),
    ]);
    await upstashCommand(['DEL', lockKey(channel, updateId)]);
  } catch (err) {
    log.error('[RedisDedupe] mark processed failed', { error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/*  In-memory fallback (no Upstash configured)                        */
/* ------------------------------------------------------------------ */

const MAX_CACHE = 10_000;

interface CacheEntry {
  processedAt: number;
  locked: boolean;
}

const memoryCache = new Map<string, CacheEntry>();

function pruneMemory(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (now - entry.processedAt > DEDUPE_TTL * 1000) {
      memoryCache.delete(key);
    }
  }
}

function evictOldest(): void {
  if (memoryCache.size >= MAX_CACHE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
}

let lastMemoryPrune = Date.now();

function maybePrune(): void {
  const now = Date.now();
  if (memoryCache.size > 100 || now - lastMemoryPrune > 300_000) {
    pruneMemory();
    lastMemoryPrune = now;
  }
}

function isUpdateProcessedMemory(channel: string, updateId: string): boolean {
  const key = dedupeKey(channel, updateId);
  maybePrune();
  const entry = memoryCache.get(key);
  return !!(entry && !entry.locked);
}

function tryAcquireProcessingLockMemory(channel: string, updateId: string): boolean {
  const key = lockKey(channel, updateId);
  maybePrune();
  if (memoryCache.has(key)) return false; // already locked
  evictOldest();
  memoryCache.set(key, { processedAt: Date.now(), locked: true });
  return true;
}

function releaseProcessingLockMemory(channel: string, updateId: string): void {
  const key = lockKey(channel, updateId);
  memoryCache.delete(key);
}

function markUpdateProcessedMemory(channel: string, updateId: string): void {
  const dKey = dedupeKey(channel, updateId);
  const lKey = lockKey(channel, updateId);
  evictOldest();
  memoryCache.set(dKey, { processedAt: Date.now(), locked: false });
  memoryCache.delete(lKey);
}
