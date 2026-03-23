import { test, expect } from '@playwright/test';

test.describe('Навигация и маршруты', () => {
  test('главная страница загружается', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Подряд PRO/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('нижняя навигация работает (mobile)', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav').last();

    // Переход на dashboard
    await nav.getByLabel('Заказы').click();
    await expect(page).toHaveURL('/dashboard');

    // Переход на создание заказа
    await nav.getByLabel('Заказ').click();
    await expect(page).toHaveURL('/app/order');

    // Переход в профиль
    await nav.getByLabel('Профиль').click();
    await expect(page).toHaveURL('/app/profile');

    // Возврат на главную
    await nav.getByLabel('Главная').click();
    await expect(page).toHaveURL('/');
  });

  test('все публичные страницы доступны', async ({ page }) => {
    const publicPages = [
      { url: '/customer', heading: /заказчик/i },
      { url: '/worker', heading: /исполнител/i },
      { url: '/equipment', heading: /аренда/i },
      { url: '/selfemployed', heading: /самозанят/i },
      { url: '/app/payments', heading: /тариф|оплат/i },
      { url: '/vip', heading: /vip/i },
      { url: '/pick', heading: /подбор/i },
    ];

    for (const { url, heading } of publicPages) {
      await page.goto(url);
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
  });

  test('профиль содержит быстрые ссылки', async ({ page }) => {
    await page.goto('/app/profile');
    await expect(page.getByText('Доска заказов')).toBeVisible();
    await expect(page.getByText('Заказы на карте')).toBeVisible();
    await expect(page.getByText('Аренда техники')).toBeVisible();
    await expect(page.getByText('Тарифы')).toBeVisible();
  });
});
