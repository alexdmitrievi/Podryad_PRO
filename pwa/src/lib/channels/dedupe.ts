/**
 * Deduplication utility for webhook updates.
 *
 * Telegram/MAX guarantee at-least-once delivery. If the server doesn't
 * respond in time, they resend the same update. This LRU cache prevents
 * duplicate processing of the same update_id.
 *
 * Also provides helpers to extract platform-specific update_id from
 * raw webhook payloads.
 */

const MAX_CACHE_SIZE = 10_000;
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  processedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Remove expired entries (called on each write if needed). */
function prune(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.processedAt > TTL_MS) {
      cache.delete(key);
    }
  }
}

let lastPrune = Date.now();

/**
 * Check if an update_id has already been processed.
 * Returns true if the update was already seen (should skip).
 * Returns false and records it if new.
 */
export function isDuplicateUpdate(updateId: string): boolean {
  const now = Date.now();

  // Prune every 100 writes or every 5 minutes
  if (cache.size > 100 || now - lastPrune > 300_000) {
    prune();
    lastPrune = now;
  }

  if (cache.has(updateId)) {
    return true; // already processed
  }

  // Evict oldest if over capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(updateId, { processedAt: now });
  return false;
}

/** Get cache size (for debugging/monitoring). */
export function getDedupeCacheSize(): number {
  return cache.size;
}

/**
 * Extract the update_id from a raw Telegram webhook payload.
 * Telegram uses `update_id` at the top level.
 */
export function extractTelegramUpdateId(body: Record<string, unknown>): string {
  return String(body.update_id ?? Date.now());
}

/**
 * Extract the update_id from a raw MAX webhook payload.
 * MAX uses `update.update_id` wrapped in an outer object.
 */
export function extractMaxUpdateId(body: Record<string, unknown>): string {
  const update = body.update as Record<string, unknown> | undefined;
  return String(update?.update_id ?? Date.now());
}
