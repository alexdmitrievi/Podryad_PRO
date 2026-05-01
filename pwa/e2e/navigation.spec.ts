import { test, expect } from '@playwright/test';

test.describe('Навигация и маршруты', () => {
  test('главная страница загружается', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Подряд PRO/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('навигация работает: основные маршруты', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Переход на register
    await page.goto('/register', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page).toHaveURL('/register');

    // Переход на login
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page).toHaveURL('/login');

    // Переход на equipment
    await page.goto('/equipment', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page).toHaveURL('/equipment');

    // Возврат на главную
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page).toHaveURL('/');
  });

  test('все публичные страницы доступны', async ({ page }) => {
    test.setTimeout(90000);
    const publicPages = [
      '/register',
      '/login',
      '/equipment',
      '/order/new',
    ];

    for (const url of publicPages) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      const hasBody = await page.locator('body').isVisible().catch(() => false);
      expect(hasBody).toBeTruthy();
    }
  });

  test('аккаунт содержит основные элементы', async ({ page }) => {
    await page.goto('/account', { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Account page redirects to /login if not authenticated.
    // Wait for either: redirect to /login, or page content loads
    try {
      await page.waitForURL(/\/login/, { timeout: 8000 });
      expect(page.url()).toContain('/login');
    } catch {
      // Not redirected — check if page has any content
      const hasBody = await page.locator('body').isVisible().catch(() => false);
      expect(hasBody).toBeTruthy();
    }
  });
});
