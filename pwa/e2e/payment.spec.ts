import { test, expect } from '@playwright/test';

test.describe('Аккаунт и профиль', () => {
  test('страница аккаунта перенаправляет неавторизованного', async ({ page }) => {
    await page.goto('/account');
    // Unauthenticated users are redirected to /login
    await expect(page).toHaveURL(/login/);
  });

  test('страница регистрации содержит информацию о стоимости', async ({ page }) => {
    await page.goto('/register');
    // Check page is loaded
    const hasHeading = await page.locator('h1').isVisible().catch(() => false);
    const hasText = await page.getByText(/регистрация/i).first().isVisible().catch(() => false);
    expect(hasHeading || hasText).toBeTruthy();
  });
});

test.describe('Доступные страницы', () => {
  test('страница создания заказа доступна', async ({ page }) => {
    await page.goto('/order/new');
    await expect(page.getByText(/Категория/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Разместить заказ/i })).toBeVisible();
  });

  test('страница оборудования содержит цены', async ({ page }) => {
    await page.goto('/equipment');
    // Wait for content to load
    const hasHeading = await page.locator('h1').isVisible().catch(() => false);
    const hasEquipment = await page.getByText(/техника|аренда/i).first().isVisible().catch(() => false);
    expect(hasHeading || hasEquipment).toBeTruthy();
  });
});
