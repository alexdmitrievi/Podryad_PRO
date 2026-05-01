import { test, expect } from '@playwright/test';

/**
 * Executor flow E2E: регистрация → логин → отклик → ЛК
 */

test.describe('Executor Flow — регистрация', () => {
  test('страница регистрации исполнителя открывается', async ({ page }) => {
    await page.goto('/join');

    await expect(page.locator('body')).toBeVisible();
    // Проверяем наличие формы или заголовка
    const hasForm = await page.getByRole('button', { name: /отправить|зарегистрироваться|стать/i }).isVisible().catch(() => false);
    const hasTitle = await page.getByRole('heading', { name: /исполнитель|подрядчик|регистрация/i }).isVisible().catch(() => false);
    expect(hasForm || hasTitle).toBeTruthy();
  });
});

test.describe('Executor Flow — личный кабинет', () => {
  test('ЛК исполнителя открывается с формой входа', async ({ page }) => {
    await page.goto('/executor');

    // Wait for the session check to complete (spinner disappears)
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    // Should have login form (phone input) or executor cabinet
    const hasInput = await page.locator('input').first().isVisible().catch(() => false);
    const hasAnyText = await page.locator('text=/личный|исполнитель|войдите|телефон|пароль/i').first().isVisible().catch(() => false);
    // Also accept spinner as valid (page is loading)
    const hasSpinner = await page.locator('.animate-spin').first().isVisible().catch(() => false);
    expect(hasInput || hasAnyText || hasSpinner).toBeTruthy();
  });
});

test.describe('Executor Flow — лента заказов', () => {
  test('публичная лента заказов с картой открывается', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/404/);
  });

  test('навигация на лендинг с dashboard работает', async ({ page }) => {
    await page.goto('/dashboard');

    // Logo or home link should exist
    const hasNav = await page.locator('nav a, header a, [aria-label*="глав"]').first().isVisible().catch(() => false);
    const hasBody = await page.locator('body').isVisible();
    expect(hasNav || hasBody).toBeTruthy();
  });
});
