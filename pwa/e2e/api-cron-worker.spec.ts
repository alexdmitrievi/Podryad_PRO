/**
 * e2e tests for the Vercel Cron worker endpoint: GET /api/cron/jobs
 *
 * These tests validate:
 *  - Auth rejection without CRON_SECRET
 *  - Successful empty-queue response
 *  - Limit / queue_name query params
 *  - POST method also accepted
 */

import { test, expect } from '@playwright/test';
import { apiGet, apiPost, cronAuthHeader } from './helpers/api';

test.describe('GET /api/cron/jobs — cron worker', () => {
  test('returns 403 when Authorization header is missing', async ({ request }) => {
    const res = await apiGet(request, '/api/cron/jobs');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Forbidden' });
  });

  test('returns 403 when wrong bearer token is supplied', async ({ request }) => {
    const res = await apiGet(request, '/api/cron/jobs', {
      Authorization: 'Bearer wrong-secret-value',
    });
    expect(res.status).toBe(403);
  });

  test('returns 403 when x-cron-secret header has wrong value', async ({ request }) => {
    const res = await apiGet(request, '/api/cron/jobs', {
      'x-cron-secret': 'wrong-value',
    });
    expect(res.status).toBe(403);
  });

  test('returns 200 with ok=true when authenticated', async ({ request }) => {
    const res = await apiGet(request, '/api/cron/jobs', cronAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      claimed: expect.any(Number),
      completed: expect.any(Number),
      retried: expect.any(Number),
      dead: expect.any(Number),
    });
  });

  test('x-cron-secret header also accepted for auth', async ({ request }) => {
    const secret = process.env.CRON_SECRET ?? 'test-cron-secret-local';
    const res = await apiGet(request, '/api/cron/jobs', { 'x-cron-secret': secret });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  test('POST method is accepted', async ({ request }) => {
    const res = await apiPost(request, '/api/cron/jobs', {}, cronAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  test('limit param is clamped between 1 and 25', async ({ request }) => {
    const res = await apiGet(request, '/api/cron/jobs?limit=999', cronAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    // claimed can be 0..25
    expect((res.body as Record<string, unknown>).claimed as number).toBeLessThanOrEqual(25);
  });

  test('queue_name param is forwarded to worker', async ({ request }) => {
    const res = await apiGet(
      request,
      '/api/cron/jobs?queue_name=notifications',
      cronAuthHeader(),
    );
    expect(res.status).toBe(200);
  });

  test('response contains worker_id string', async ({ request }) => {
    const res = await apiGet(request, '/api/cron/jobs', cronAuthHeader());
    expect(res.status).toBe(200);
    expect(typeof (res.body as Record<string, unknown>).worker_id).toBe('string');
  });
});
