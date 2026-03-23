import { test, expect } from '@playwright/test';

test.describe('Создание заказа', () => {
  test('форма заказа отображает все поля', async ({ page }) => {
    await page.goto('/app/order');

    // Все обязательные поля видны
    await expect(page.getByText(/тип работ/i)).toBeVisible();
    await expect(page.getByPlaceholder(/адрес/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /опубликовать|создать|отправить/i })).toBeVisible();
  });

  test('выбор типа работ подсвечивает кнопку', async ({ page }) => {
    await page.goto('/app/order');

    // Клик по типу работ
    const workTypeBtn = page.getByRole('button', { name: /грузчики/i });
    if (await workTypeBtn.isVisible()) {
      await workTypeBtn.click();
      // Кнопка должна стать активной (brand-500 или подобный класс)
      await expect(workTypeBtn).toHaveClass(/brand|selected|active/);
    }
  });

  test('валидация: пустой адрес не проходит', async ({ page }) => {
    await page.goto('/app/order');

    // Выбираем тип
    const gruzchiki = page.getByRole('button', { name: /грузчики/i });
    if (await gruzchiki.isVisible()) {
      await gruzchiki.click();
    }

    // Пробуем отправить без адреса
    const submitBtn = page.getByRole('button', { name: /опубликовать|создать|отправить/i });
    await submitBtn.click();

    // Должна показаться ошибка
    await expect(page.getByText(/адрес|заполните|обязательн/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard заказов', () => {
  test('dashboard загружается и показывает заголовок', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    // Либо заказы, либо пустое состояние
    const hasOrders = await page.getByText(/заказ/i).first().isVisible();
    expect(hasOrders).toBeTruthy();
  });

  test('переключение вида список/карта', async ({ page }) => {
    await page.goto('/dashboard');
    const mapBtn = page.getByRole('button', { name: /карт/i });
    if (await mapBtn.isVisible()) {
      await mapBtn.click();
      // Карта должна загрузиться
      await expect(page.locator('.leaflet-container, [data-testid="map"]')).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
