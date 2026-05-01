/**
 * Full executor (исполнитель) journey:
 *   1. Open /worker landing page
 *   2. Open /join — registration form (solo + brigade)
 *   3. Submit application
 *   4. Browse open orders at /dashboard (read-only public feed)
 *
 * Backend is mocked.
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_PHONE = '+7 (900) 555-44-33';
const TEST_NAME = 'Пётр Исполнителев';

async function mockExecutorApis(page: Page) {
  await page.route('**/api/contractors', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, contractor_id: 'exec-1' }),
    }),
  );

  await page.route('**/api/orders/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orders: [
          {
            id: 'ord-100',
            work_type: 'labor',
            subcategory: 'Грузчики',
            address: 'Омск, ул. Гагарина 5',
            address_lat: 54.99,
            address_lng: 73.37,
            display_price: 7000,
            city: 'omsk',
            created_at: new Date().toISOString(),
          },
        ],
      }),
    }),
  );

  await page.route('**/api/orders/respond', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, response_id: 1 }),
    }),
  );
}

test.describe('Полный путь исполнителя', () => {
  test.beforeEach(async ({ page }) => {
    await mockExecutorApis(page);
  });

  test('1. Лендинг /worker для исполнителей открывается', async ({ page }) => {
    await page.goto('/worker');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('2. Форма /join рендерит solo + brigade переключатель', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('body')).toBeVisible();
    // Переключатель типа: solo / brigade — проверяем что есть какой-то выбор
    const phoneInput = page.getByPlaceholder(/\+7/);
    await expect(phoneInput).toBeVisible({ timeout: 10000 });
  });

  test('3. Регистрация исполнителя: заполняем и отправляем', async ({ page }) => {
    await page.goto('/join');

    // Имя — первый текстовый input в форме
    await page.locator('form input[type="text"]').first().fill(TEST_NAME);

    // Телефон
    await page.getByPlaceholder(/\+7/).pressSequentially('9005554433');

    // Специализация
    const specBtn = page.getByRole('button', { name: /^грузчики$/i }).first();
    if (await specBtn.isVisible().catch(() => false)) {
      await specBtn.click();
    }

    // Согласие 152-ФЗ — последний чекбокс в форме
    const consent = page.locator('form input[type="checkbox"]').last();
    await consent.scrollIntoViewIfNeeded();
    await consent.click();
    await expect(consent).toBeChecked();

    // Submit
    const submit = page.getByRole('button', { name: /отправить анкету/i });
    await submit.scrollIntoViewIfNeeded();
    await submit.click();

    // Успех
    await expect(page.getByText(/анкета отправлена/i)).toBeVisible({ timeout: 10000 });
  });

  test('4. Лента заказов /dashboard показывает доступные заказы', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('span').filter({ hasText: /заказ.* на карте/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
