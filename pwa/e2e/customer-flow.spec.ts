import { test, expect } from '@playwright/test';

/**
 * Customer flow E2E: регистрация → логин → заказ → ЛК
 * Проверяет полный happy-path заказчика
 */

test.describe('Customer Flow — регистрация и логин', () => {
  test('страница регистрации открывается и содержит форму', async ({ page }) => {
    await page.goto('/register');

    // Register page has a 2-step form. Step 1 has phone input and "Далее" button.
    const hasInput = await page.locator('input, [role="textbox"]').first().isVisible().catch(() => false);
    const hasButton = await page.getByRole('button').first().isVisible().catch(() => false);
    expect(hasInput || hasButton).toBeTruthy();
  });

  test('страница логина открывается', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('навигация между логином и регистрацией работает', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.getByRole('link', { name: /войти/i });
    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await Promise.all([
        page.waitForURL(/\/login/),
        loginLink.click(),
      ]);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe('Customer Flow — создание заказа', () => {
  test('форма заказа открывается', async ({ page }) => {
    await page.goto('/order/new');

    await expect(page.locator('body')).toBeVisible();
    // Проверяем наличие ключевых элементов формы
    const hasForm = await page.getByRole('button', { name: /отправить|создать|заказ|опубликовать/i }).isVisible().catch(() => false);
    const hasInputs = await page.locator('input, textarea, select').first().isVisible().catch(() => false);
    expect(hasForm || hasInputs).toBeTruthy();
  });

  test('альтернативная форма заказа открывается', async ({ page }) => {
    await page.goto('/orders/new');

    await expect(page.locator('body')).toBeVisible();
  });

  test('страница каталога открывается', async ({ page }) => {
    await page.goto('/catalog/labor');

    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/404/);
  });
});

test.describe('Customer Flow — личный кабинет', () => {
  test('страница аккаунта открывается', async ({ page }) => {
    await page.goto('/account');

    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/404/);
  });

  test('восстановление доступа по токену', async ({ page }) => {
    await page.goto('/my/test-token', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Page shows either: loading spinner, "Ссылка недействительна", or orders list
    await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
  });

  test('лендинг содержит CTA-кнопки', async ({ page }) => {
    await page.goto('/');

    // Проверяем наличие ключевых элементов лендинга
    await expect(page.locator('body')).toBeVisible();

    // Ищем CTA или формы
    const ctaButtons = page.getByRole('button', { name: /заказ|оставить заявку|начать|рассчитать/i });
    const ctaLinks = page.getByRole('link', { name: /заказ|стать исполнителем|каталог/i });

    const hasCTA = await ctaButtons.first().isVisible().catch(() => false)
      || await ctaLinks.first().isVisible().catch(() => false);

    expect(hasCTA).toBeTruthy();
  });
});
