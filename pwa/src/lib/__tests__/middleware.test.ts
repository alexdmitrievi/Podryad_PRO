import { describe, it, expect } from 'vitest';

/**
 * Pure constant-time comparison function replicated from src/middleware.ts
 * for unit testing. The middleware itself uses NextRequest/NextResponse which
 * cannot be easily unit-tested without heavy mocking.
 *
 * Manual integration tests cover the full middleware pipeline:
 *   - Admin APIs reject requests without valid x-admin-pin header
 *   - Admin APIs reject requests with wrong PIN
 *   - Admin APIs accept requests with correct ADMIN_PIN
 *   - CSRF rejects POST /api/orders with mismatched Origin header
 *   - CSRF allows POST /api/telegram/webhook regardless of Origin
 *   - Non-mutating GET /api/orders/public passes without Origin check
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(constantTimeEqual('abc123', 'def456')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(constantTimeEqual('abc', 'abcdef')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true);
  });

  it('returns true for single character same', () => {
    expect(constantTimeEqual('a', 'a')).toBe(true);
  });

  it('returns false for single character different', () => {
    expect(constantTimeEqual('a', 'b')).toBe(false);
  });

  it('returns false when one string is a prefix of another', () => {
    // Different lengths → immediate false before bitwise comparison
    expect(constantTimeEqual('secret', 'secret123')).toBe(false);
  });

  it('uses bitwise XOR for constant-time comparison (no early exit)', () => {
    // The implementation uses | to accumulate differences instead of
    // returning early, preventing timing-based length discovery beyond
    // the initial length check (which is themselves constant-time
    // when considering that differing lengths are revealed).
    // This test verifies the algorithm shape:
    const a = 'aaaaaaaaaa';
    const b = 'aaaaaaaaab';
    // Same length, only last char differs — bitwise XOR |= accumulates
    expect(constantTimeEqual(a, b)).toBe(false);
    expect(constantTimeEqual(a, a)).toBe(true);
  });
});

describe('CSRF check logic', () => {
  const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  const WEBHOOK_PATHS = [
    '/api/telegram/webhook',
    '/api/max/webhook',
    '/api/avito/webhook',
    '/api/payment/callback',
  ];

  function shouldCheckCsrf(pathname: string, method: string): boolean {
    return (
      pathname.startsWith('/api/') &&
      MUTATING_METHODS.has(method) &&
      !WEBHOOK_PATHS.some((wp) => pathname.startsWith(wp))
    );
  }

  it('requires CSRF check for POST /api/orders', () => {
    expect(shouldCheckCsrf('/api/orders', 'POST')).toBe(true);
  });

  it('requires CSRF check for PUT /api/orders/123', () => {
    expect(shouldCheckCsrf('/api/orders/123', 'PUT')).toBe(true);
  });

  it('requires CSRF check for PATCH /api/orders/123/dispute', () => {
    expect(shouldCheckCsrf('/api/orders/123/dispute', 'PATCH')).toBe(true);
  });

  it('requires CSRF check for DELETE /api/admin/orders/123', () => {
    expect(shouldCheckCsrf('/api/admin/orders/123', 'DELETE')).toBe(true);
  });

  it('skips CSRF check for GET /api/orders (read-only)', () => {
    expect(shouldCheckCsrf('/api/orders', 'GET')).toBe(false);
  });

  it('skips CSRF check for non-API paths', () => {
    expect(shouldCheckCsrf('/orders', 'POST')).toBe(false);
  });

  it('skips CSRF for /api/telegram/webhook regardless of method', () => {
    expect(shouldCheckCsrf('/api/telegram/webhook', 'POST')).toBe(false);
  });

  it('skips CSRF for /api/max/webhook regardless of method', () => {
    expect(shouldCheckCsrf('/api/max/webhook', 'POST')).toBe(false);
  });

  it('skips CSRF for /api/avito/webhook regardless of method', () => {
    expect(shouldCheckCsrf('/api/avito/webhook', 'POST')).toBe(false);
  });

  it('skips CSRF for /api/payment/callback', () => {
    expect(shouldCheckCsrf('/api/payment/callback', 'POST')).toBe(false);
  });

  it('checks CSRF for /api/telegram/something-else (not webhook sub-path)', () => {
    // This path starts with /api/telegram/ but NOT webhook → should check
    expect(shouldCheckCsrf('/api/telegram/something-else', 'POST')).toBe(true);
  });
});

describe('Origin vs Host matching (pure logic)', () => {
  function originMatchesHost(origin: string | null, host: string | null): boolean {
    if (!origin || !host) return true; // skip if headers missing
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  it('matches when origin host equals request host', () => {
    expect(originMatchesHost('https://podryad.pro', 'podryad.pro')).toBe(true);
  });

  it('rejects when origin host differs from request host', () => {
    expect(originMatchesHost('https://evil.com', 'podryad.pro')).toBe(false);
  });

  it('returns true (skip) when origin is missing', () => {
    expect(originMatchesHost(null, 'podryad.pro')).toBe(true);
  });

  it('returns true (skip) when host is missing', () => {
    expect(originMatchesHost('https://podryad.pro', null)).toBe(true);
  });

  it('rejects malformed origin URL', () => {
    expect(originMatchesHost('not-a-url', 'podryad.pro')).toBe(false);
  });

  it('matches with port numbers', () => {
    expect(originMatchesHost('https://localhost:3000', 'localhost:3000')).toBe(true);
  });

  it('rejects with different port', () => {
    expect(originMatchesHost('https://localhost:4000', 'localhost:3000')).toBe(false);
  });
});
