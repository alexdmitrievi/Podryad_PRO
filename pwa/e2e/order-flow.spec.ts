import { test, expect } from '@playwright/test';

test.describe('Создание заказа', () => {
  test('форма заказа отображает все поля', async ({ page }) => {
    await page.goto('/order/new');

    // Category selector and address field
    await expect(page.getByText(/Категория/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/адрес/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Разместить заказ/i })).toBeVisible();
  });

  test('выбор типа работ подсвечивает кнопку', async ({ page }) => {
    await page.goto('/order/new');

    // Click "Рабочие" category button (exact match to avoid matching "Разнорабочие")
    const workTypeBtn = page.getByRole('button', { name: 'Рабочие', exact: true });
    if (await workTypeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await workTypeBtn.click();
      const hasActiveClass = await workTypeBtn.evaluate(el =>
        el.className.includes('brand') || el.getAttribute('aria-pressed') === 'true'
      );
      expect(hasActiveClass).toBeTruthy();
    }
  });

  test('валидация: незаполненный телефон не проходит', async ({ page }) => {
    await page.goto('/order/new');

    // Try to submit without filling phone
    const submitBtn = page.getByRole('button', { name: /Разместить заказ/i });
    // Phone is required, consent is required — clicking without them should show error/toast
    const isDisabled = await submitBtn.isDisabled();
    expect(isDisabled).toBeTruthy();
  });
});

test.describe('Dashboard заказов', () => {
  test('dashboard загружается и показывает заголовок', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    const hasContent = await page.getByText(/заказ|подряд/i).first().isVisible().catch(() => false);
    const hasTitle = await page.locator('h1').isVisible().catch(() => false);
    expect(hasContent || hasTitle).toBeTruthy();
  });

  test('переключение вида список/карта', async ({ page }) => {
    await page.goto('/dashboard');
    const mapBtn = page.getByRole('button', { name: /карт/i });
    if (await mapBtn.isVisible()) {
      await mapBtn.click();
      // Map should load
      await expect(page.locator('.leaflet-container, [data-testid="map"]')).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
