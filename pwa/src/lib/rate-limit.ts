/**
 * Rate limiter with Upstash Redis (distributed) + in-memory fallback.
 *
 * Production: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   → survives server restarts, shared across Vercel instances.
 * Local / missing env: falls back to per-process Map (resets on restart).
 *
 * Fixed-window algorithm: INCR + EXPIRE NX. Fails open to in-memory
 * on Redis errors so a Redis outage cannot DoS the whole app.
 */

import { log } from '@/lib/logger';

const memoryStore = new Map<string, { count: number; resetAt: number }>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) memoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL as string;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string;
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return data.map((d) => {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
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

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterMs: number;
}

export async function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
): Promise<RateLimitResult> {
  if (hasUpstash()) {
    try {
      const redisKey = `rl:${key}`;
      const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
      const [countRaw] = await upstashPipeline([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSec, 'NX'],
      ]);
      const count = Number(countRaw);
      if (count > maxAttempts) {
        const ttlRaw = await upstashCommand(['PTTL', redisKey]);
        const ttl = Number(ttlRaw);
        return {
          limited: true,
          remaining: 0,
          retryAfterMs: ttl > 0 ? ttl : windowMs,
        };
      }
      return {
        limited: false,
        remaining: Math.max(0, maxAttempts - count),
        retryAfterMs: 0,
      };
    } catch (err) {
      log.error('rate-limit Upstash fallback to in-memory', { error: String(err) });
    }
  }
  return checkInMemory(key, maxAttempts, windowMs);
}

function checkInMemory(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return { limited: false, remaining: maxAttempts - entry.count, retryAfterMs: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  if (hasUpstash()) {
    try {
      await upstashCommand(['DEL', `rl:${key}`]);
    } catch (err) {
      log.error('rate-limit reset Upstash error', { error: String(err) });
    }
  }
  memoryStore.delete(key);
}
