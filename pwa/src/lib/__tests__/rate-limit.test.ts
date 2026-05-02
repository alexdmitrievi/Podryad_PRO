import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from '../rate-limit';

describe('checkRateLimit (in-memory fallback)', () => {
  const key = 'test-key-' + Math.random().toString(36).slice(2);

  beforeEach(async () => {
    await resetRateLimit(key);
  });

  it('allows first request', async () => {
    const result = await checkRateLimit(key, 5, 60_000);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(4);
  });

  it('tracks multiple requests in window', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit(key, 5, 60_000);
      expect(r.limited).toBe(false);
      expect(r.remaining).toBe(4 - i);
    }
  });

  it('blocks after max attempts exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(key, 3, 60_000);
    }
    const result = await checkRateLimit(key, 3, 60_000);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets counter after resetRateLimit', async () => {
    await checkRateLimit(key, 2, 60_000);
    await checkRateLimit(key, 2, 60_000);
    const blocked = await checkRateLimit(key, 2, 60_000);
    expect(blocked.limited).toBe(true);

    await resetRateLimit(key);
    const fresh = await checkRateLimit(key, 2, 60_000);
    expect(fresh.limited).toBe(false);
    expect(fresh.remaining).toBe(1);
  });

  it('different keys have independent counters', async () => {
    const key2 = key + '-other';
    await resetRateLimit(key2);

    await checkRateLimit(key, 2, 60_000);
    await checkRateLimit(key, 2, 60_000);

    const result = await checkRateLimit(key2, 2, 60_000);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(1);
  });

  it('returns retryAfterMs when blocked', async () => {
    await checkRateLimit(key, 1, 60_000);
    const blocked = await checkRateLimit(key, 1, 60_000);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(61_000);
  });

  it('handles maxAttempts=1 correctly', async () => {
    const r1 = await checkRateLimit(key, 1, 60_000);
    expect(r1.limited).toBe(false);
    expect(r1.remaining).toBe(0);

    const r2 = await checkRateLimit(key, 1, 60_000);
    expect(r2.limited).toBe(true);
  });

  it('handles large maxAttempts', async () => {
    const r = await checkRateLimit(key, 100, 60_000);
    expect(r.limited).toBe(false);
    expect(r.remaining).toBe(99);
  });
});
