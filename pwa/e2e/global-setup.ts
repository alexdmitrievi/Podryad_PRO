import { FullConfig } from '@playwright/test';

/**
 * Playwright global setup — runs once before any test suite.
 *
 * Guards:
 *  1. Ensures NEXT_PUBLIC_SUPABASE_URL is not the production DB when running locally.
 *  2. Ensures CRON_SECRET is set so API tests can call the worker endpoint.
 *  3. Sets NEXT_PUBLIC_APP_URL to localhost so job-worker generates correct test URLs.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const isProd = supabaseUrl.includes('rnqalafmuyrlfioqdore');

  if (isProd && process.env.E2E_ALLOW_PROD !== '1') {
    throw new Error(
      '[e2e] globalSetup: NEXT_PUBLIC_SUPABASE_URL points to the PRODUCTION Supabase instance.\n' +
      'e2e tests must not run against production data.\n' +
      'Set E2E_ALLOW_PROD=1 to override (not recommended), or use a dedicated test project.',
    );
  }

  // Make sure the cron worker can be called in API-level tests
  if (!process.env.CRON_SECRET) {
    process.env.CRON_SECRET = 'test-cron-secret-local';
    console.warn('[e2e] CRON_SECRET not set — using ephemeral test value: test-cron-secret-local');
  }

  // Point job-worker URLs to localhost during e2e
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  }
}
