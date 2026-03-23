import { test, expect } from '@playwright/test';

test.describe('Страница оплаты', () => {
  test('без order_id показывает ошибку', async ({ page }) => {
    await page.goto('/payment');
    // Должно быть сообщение об отсутствии order_id или заказа
    await expect(page.getByText(/заказ|order|не найден|укажите/i)).toBeVisible({ timeout: 5000 });
  });

  test('с невалидным order_id показывает ошибку', async ({ page }) => {
    await page.goto('/payment?order_id=nonexistent-123');
    // Ожидаем загрузку и ошибку
    await expect(page.getByText(/не найден|ошибка|error/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Страница тарифов', () => {
  test('тарифы загружаются и отображаются', async ({ page }) => {
    await page.goto('/app/payments');
    await expect(page.getByText(/тариф|оплат|стоимость/i).first()).toBeVisible();
    // Проверяем наличие хотя бы одного тарифа
    await expect(page.getByText(/₽/)).toBeVisible();
  });

  test('информация о гарантиях видна', async ({ page }) => {
    await page.goto('/app/payments');
    await expect(page.getByText(/гарант|безопасн|возврат/i).first()).toBeVisible();
  });
});
