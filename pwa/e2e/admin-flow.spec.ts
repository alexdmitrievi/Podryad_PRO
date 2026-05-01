/**
 * Admin journey:
 *   1. PIN gate denies wrong PIN
 *   2. PIN gate accepts correct PIN
 *   3. Все ключевые вкладки переключаются (Заказы, Исполнители, Заказчики,
 *      Заявки, Контакты, Отклики, Пользователи, Документы, Наценки, Споры,
 *      CRM, Аналитика, Позиции, Медиа, Наша техника)
 *
 * Backend is mocked: verify-pin returns 200 only when pin === '123456'.
 * Admin tab data endpoints return empty lists so the UI shows empty state
 * without errors.
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN_PIN = '123456';

async function mockAdminApis(page: Page) {
  await page.route('**/api/admin/verify-pin', async (route) => {
    const body = route.request().postDataJSON?.() ?? {};
    if (body?.pin === ADMIN_PIN) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Неверный PIN' }),
    });
  });

  // Catch-all admin endpoints — return empty payloads so tabs don't blow up
  const adminEndpoints = [
    '**/api/admin/orders**',
    '**/api/admin/customers**',
    '**/api/admin/contractors**',
    '**/api/admin/leads**',
    '**/api/admin/contacts**',
    '**/api/admin/responses**',
    '**/api/admin/markup-rates**',
    '**/api/admin/disputes**',
    '**/api/admin/listings**',
    '**/api/admin/own-equipment**',
    '**/api/admin/site-images**',
    '**/api/admin/documents**',
    '**/api/admin/analytics**',
    '**/api/admin/crm/**',
    '**/api/admin/generate-link**',
    '**/api/admin/recalculate-prices**',
  ];
  for (const pattern of adminEndpoints) {
    await page.route(pattern, (route) => {
      const method = route.request().method();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          method === 'GET'
            ? { ok: true, items: [], orders: [], customers: [], contractors: [], leads: [], contacts: [], responses: [], rates: [], disputes: [], listings: [], data: [] }
            : { ok: true, link: 'https://podryad.pro/my/test-token' },
        ),
      });
    });
  }
}

test.describe('Админ-панель', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
  });

  test('1. PIN gate отображается для неавторизованного', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /админ/i })).toBeVisible();
    await expect(page.getByPlaceholder(/PIN/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /войти/i })).toBeVisible();
  });

  test('2. Неверный PIN показывает ошибку', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/PIN/i).fill('000000');
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page.getByText(/неверн|ошибка/i)).toBeVisible({ timeout: 5000 });
  });

  test('3. Правильный PIN открывает админку с табами', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/PIN/i).fill(ADMIN_PIN);
    await page.getByRole('button', { name: /войти/i }).click();

    // Ожидаем появления таб-навигации
    await expect(page.getByRole('button', { name: /CRM Воронка/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('4. Все ключевые табы присутствуют в навигации', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/PIN/i).fill(ADMIN_PIN);
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page.getByRole('button', { name: /CRM Воронка/i })).toBeVisible({
      timeout: 10000,
    });

    const tabs = [
      'Заказы',
      'Позиции',
      'Исполнители',
      'Заказчики',
      'Заявки',
      'Контакты',
      'Отклики',
      'Пользователи',
      'Документы',
      'Наценки',
      'Споры',
      'CRM Воронка',
      'Аналитика',
      'Наша техника',
      'Медиа',
    ];

    for (const label of tabs) {
      await expect(
        page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first(),
      ).toBeVisible();
    }
  });

  test('4b. Переключение между двумя табами не ломает админку', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/PIN/i).fill(ADMIN_PIN);
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page.getByRole('button', { name: /CRM Воронка/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /^Заказы$/i }).first().click();
    await page.getByRole('button', { name: /^Пользователи$/i }).first().click();

    // Кнопка «Выйти» по-прежнему доступна
    await expect(page.getByRole('button', { name: /выйти/i })).toBeVisible();
  });

  test('5. Кнопка "Выйти" возвращает к PIN gate', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/PIN/i).fill(ADMIN_PIN);
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page.getByRole('button', { name: /CRM Воронка/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /выйти/i }).click();
    await expect(page.getByPlaceholder(/PIN/i)).toBeVisible();
  });

  test('6. Tab "Пользователи" — генерация ссылки личного кабинета', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/PIN/i).fill(ADMIN_PIN);
    await page.getByRole('button', { name: /войти/i }).click();
    await page.getByRole('button', { name: /^Пользователи$/i }).first().click();

    // Должны появиться поля имя/телефон и кнопка генерации
    const formVisible = await page
      .getByRole('button', { name: /создать|сгенерировать|выдать/i })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(formVisible).toBeTruthy();
  });
});
