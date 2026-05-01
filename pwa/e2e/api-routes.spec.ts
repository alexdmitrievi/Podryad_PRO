/**
 * e2e tests for key API routes.
 *
 * These tests exercise the HTTP layer (validation, status codes, headers) without
 * caring about the exact DB side-effect — they verify contract, not data.
 *
 * Covered routes:
 *  - POST /api/orders          (create order — main PWA flow)
 *  - POST /api/my/recover      (send dashboard link)
 *  - POST /api/orders/respond  (executor responds to an order)
 */

import { test, expect } from '@playwright/test';
import { apiPost } from './helpers/api';

// ─── POST /api/orders ─────────────────────────────────────────────────────────

test.describe('POST /api/orders', () => {
  test('returns 422 when phone is missing', async ({ request }) => {
    const res = await apiPost(request, '/api/orders', {
      work_type: 'labor',
      address: 'ул. Ленина 1',
    });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: 'invalid_phone' });
  });

  test('returns 422 when phone has fewer than 10 digits', async ({ request }) => {
    const res = await apiPost(request, '/api/orders', {
      work_type: 'labor',
      phone: '12345',
      address: 'ул. Ленина 1',
    });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: 'invalid_phone' });
  });

  test('returns 422 when work_type is invalid', async ({ request }) => {
    const res = await apiPost(request, '/api/orders', {
      work_type: 'unknown_type',
      phone: '79991234567',
      address: 'ул. Ленина 1',
    });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: 'invalid_work_type' });
  });

  test('returns 400 when body is not valid JSON', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 422]).toContain(response.status());
  });
});

// ─── POST /api/my/recover ─────────────────────────────────────────────────────

test.describe('POST /api/my/recover', () => {
  test('returns 422 for short phone', async ({ request }) => {
    const res = await apiPost(request, '/api/my/recover', { phone: '123' });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: 'invalid_phone' });
  });

  test('returns 200 with ok:true even when phone is not registered (no info leak)', async ({
    request,
  }) => {
    const res = await apiPost(request, '/api/my/recover', {
      phone: '79999999991',
    });
    // Always 200 — no hint whether phone exists
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  test('returns 4xx when body is not valid JSON', async ({ request }) => {
    const response = await request.post('/api/my/recover', {
      data: '{bad}',
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 422]).toContain(response.status());
  });
});

// ─── POST /api/orders/respond ─────────────────────────────────────────────────

test.describe('POST /api/orders/respond', () => {
  test('returns 4xx when required fields are missing', async ({ request }) => {
    const res = await apiPost(request, '/api/orders/respond', {});
    expect([400, 422]).toContain(res.status);
  });

  test('returns 4xx when body is not valid JSON', async ({ request }) => {
    const response = await request.post('/api/orders/respond', {
      data: '{bad}',
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 422]).toContain(response.status());
  });
});

// ─── POST /api/leads ──────────────────────────────────────────────────────────

test.describe('POST /api/leads', () => {
  test('returns 4xx when phone is missing', async ({ request }) => {
    const res = await apiPost(request, '/api/leads', { name: 'Test' });
    expect([400, 422]).toContain(res.status);
  });
});

// ─── POST /api/contractors ────────────────────────────────────────────────────

test.describe('POST /api/contractors', () => {
  test('returns 4xx when required fields are missing', async ({ request }) => {
    const res = await apiPost(request, '/api/contractors', {});
    expect([400, 422]).toContain(res.status);
  });
});
