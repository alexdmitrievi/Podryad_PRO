import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env.test.local when running e2e tests
dotenvConfig({ path: resolve(__dirname, '.env.test.local'), override: false });
dotenvConfig({ path: resolve(__dirname, '.env.local'), override: false });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Pass CRON_SECRET to API request context
    extraHTTPHeaders: {
      'x-e2e': '1',
    },
  },
  projects: [
    {
      name: 'Mobile Chrome',
      testIgnore: /api-.*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Desktop Chrome',
      testIgnore: /api-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Headless API-only project — no browser UI, faster
      name: 'API',
      testMatch: /api-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      CRON_SECRET: process.env.CRON_SECRET ?? 'test-cron-secret-local',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
  },
});
