/**
 * Typed helper for making JSON API requests in Playwright e2e tests.
 *
 * Usage:
 *   import { apiPost, apiGet } from './helpers/api';
 *   const { status, body } = await apiPost(request, '/api/orders', { ... });
 */

import type { APIRequestContext } from '@playwright/test';

export interface ApiResponse<T = Record<string, unknown>> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export async function apiPost<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  payload: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResponse<T>> {
  const response = await request.post(path, {
    data: payload,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status(), body, headers: response.headers() };
}

export async function apiGet<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  headers: Record<string, string> = {},
): Promise<ApiResponse<T>> {
  const response = await request.get(path, { headers });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status(), body, headers: response.headers() };
}

/** Build the Authorization header value for the cron worker endpoint. */
export function cronAuthHeader(): Record<string, string> {
  const secret = process.env.CRON_SECRET ?? 'test-cron-secret-local';
  return { Authorization: `Bearer ${secret}` };
}
