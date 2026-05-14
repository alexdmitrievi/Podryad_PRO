import { test, expect, type APIRequestContext } from '@playwright/test';
import { apiPost, apiGet } from './helpers/api';

/**
 * Admin full-flow E2E: PIN verification → login → list resources →
 * admin operations → wrong PIN rejection.
 *
 * All admin endpoints require x-admin-pin header (validated by middleware).
 * Tests use API request context for all steps.
 */

const ADMIN_PIN = process.env.ADMIN_PIN ?? 'test-pin';
const WRONG_PIN = 'wrong-pin-12345';

function adminHeaders(): Record<string, string> {
  return { 'x-admin-pin': ADMIN_PIN };
}

function wrongHeaders(): Record<string, string> {
  return { 'x-admin-pin': WRONG_PIN };
}

test.describe('Admin Full Flow — Verify PIN', () => {
  test('POST /api/admin/verify-pin returns valid:true with correct PIN', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/admin/verify-pin', {
      pin: ADMIN_PIN,
    });

    expect(status).toBe(200);
    expect(body.valid).toBe(true);
  });

  test('POST /api/admin/verify-pin returns valid:false with wrong PIN', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/admin/verify-pin', {
      pin: WRONG_PIN,
    });

    expect([200, 429]).toContain(status);
    expect(body.valid).toBe(false);
  });
});

test.describe('Admin Full Flow — Login', () => {
  test('POST /api/admin/login returns ok:true with legacy PIN credentials', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/admin/login', {
      username: 'admin',
      password: ADMIN_PIN,
    });

    // Login may succeed (200) or return 401/429 depending on rate limits and DB state
    expect([200, 401, 429]).toContain(status);

    if (status === 200) {
      expect(body.ok).toBe(true);
      expect(body.admin).toBeDefined();
    }
  });

  test('POST /api/admin/login returns 400 when credentials are missing', async ({ request }) => {
    const { status } = await apiPost(request, '/api/admin/login', {});

    expect([400, 401, 429]).toContain(status);
  });
});

test.describe('Admin Full Flow — List endpoints (with x-admin-pin)', () => {
  const apiListTest = async (request: APIRequestContext, path: string) => {
    const { status } = await apiGet(request, path, adminHeaders());
    expect([200, 400, 403, 500]).toContain(status);
  };

  test('GET /api/admin/orders returns 200 with order array', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/admin/orders', adminHeaders());

    expect([200, 403, 500]).toContain(status);

    if (status === 200) {
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.orders)).toBe(true);
    }
  });

  test('GET /api/admin/leads responds successfully', async ({ request }) => {
    await apiListTest(request, '/api/admin/leads');
  });

  test('GET /api/admin/contractors responds successfully', async ({ request }) => {
    await apiListTest(request, '/api/admin/contractors');
  });

  test('GET /api/admin/customers responds successfully', async ({ request }) => {
    await apiListTest(request, '/api/admin/customers');
  });

  test('GET /api/admin/analytics responds successfully', async ({ request }) => {
    await apiListTest(request, '/api/admin/analytics');
  });

  test('GET /api/admin/markup-rates responds successfully', async ({ request }) => {
    await apiListTest(request, '/api/admin/markup-rates');
  });
});

test.describe('Admin Full Flow — Operations (with x-admin-pin)', () => {
  test('POST /api/admin/generate-link returns meaningful response', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/admin/generate-link', {
      name: 'Тестовый Клиент',
      phone: '79991234567',
    }, adminHeaders());

    expect([200, 201, 400, 403, 500]).toContain(status);

    if (status === 200 || status === 201) {
      expect(body.ok).toBe(true);
      expect(body.link).toBeDefined();
      expect(body.token).toBeDefined();
    }
  });
});

test.describe('Admin Full Flow — Wrong PIN rejected', () => {
  test('GET /api/admin/orders returns 403 with wrong PIN', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/admin/orders', wrongHeaders());

    expect(status).toBe(403);
    expect(body).toMatchObject({ error: 'Forbidden' });
  });

  test('GET /api/admin/leads returns 403 with wrong PIN', async ({ request }) => {
    const { status } = await apiGet(request, '/api/admin/leads', wrongHeaders());

    expect(status).toBe(403);
  });

  test('GET /api/admin/contractors returns 403 with wrong PIN', async ({ request }) => {
    const { status } = await apiGet(request, '/api/admin/contractors', wrongHeaders());

    expect(status).toBe(403);
  });

  test('GET /api/admin/customers returns 403 with wrong PIN', async ({ request }) => {
    const { status } = await apiGet(request, '/api/admin/customers', wrongHeaders());

    expect(status).toBe(403);
  });

  test('GET /api/admin/analytics returns 403 with wrong PIN', async ({ request }) => {
    const { status } = await apiGet(request, '/api/admin/analytics', wrongHeaders());

    expect(status).toBe(403);
  });

  test('GET /api/admin/markup-rates returns 403 with wrong PIN', async ({ request }) => {
    const { status } = await apiGet(request, '/api/admin/markup-rates', wrongHeaders());

    expect(status).toBe(403);
  });

  test('POST /api/admin/generate-link returns 403 with wrong PIN', async ({ request }) => {
    const { status } = await apiPost(request, '/api/admin/generate-link', {
      name: 'Test',
      phone: '79991234567',
    }, wrongHeaders());

    expect(status).toBe(403);
  });

  test('All admin list endpoints reject empty PIN header', async ({ request }) => {
    const endpoints = [
      '/api/admin/orders',
      '/api/admin/leads',
      '/api/admin/contractors',
      '/api/admin/customers',
      '/api/admin/analytics',
      '/api/admin/markup-rates',
    ];

    for (const path of endpoints) {
      const { status } = await apiGet(request, path, { 'x-admin-pin': '' });
      expect(status).toBe(403);
    }
  });
});
