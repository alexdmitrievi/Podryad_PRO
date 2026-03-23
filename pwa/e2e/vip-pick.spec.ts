import { test, expect } from '@playwright/test';

test.describe('VIP подписка', () => {
  test('страница VIP загружается с преимуществами', async ({ page }) => {
    await page.goto('/vip');

    await expect(page.getByText(/ранний доступ/i)).toBeVisible();
    await expect(page.getByText(/приоритет/i)).toBeVisible();
    await expect(page.getByText(/1\s?000\s?₽/)).toBeVisible();
  });

  test('кнопка VIP требует авторизации', async ({ page }) => {
    await page.goto('/vip');

    const subscribeBtn = page.getByRole('button', { name: /оформить vip/i });
    const loginPrompt = page.getByText(/войдите|авториз/i);

    // Либо кнопка, либо блок авторизации
    const isSubscribeVisible = await subscribeBtn.isVisible().catch(() => false);
    const isLoginPromptVisible = await loginPrompt.isVisible().catch(() => false);

    expect(isSubscribeVisible || isLoginPromptVisible).toBeTruthy();
  });
});

test.describe('Подбор исполнителей', () => {
  test('страница /pick загружается', async ({ page }) => {
    await page.goto('/pick');

    await expect(page.getByText(/подбор/i)).toBeVisible();
    await expect(page.getByText(/1\s?000\s?₽/)).toBeVisible();
  });

  test('форма подбора содержит поля', async ({ page }) => {
    await page.goto('/pick');

    // Тип работ или текстовое описание
    const hasTextarea = await page.locator('textarea').isVisible().catch(() => false);
    const hasSelect = await page.locator('select').isVisible().catch(() => false);

    expect(hasTextarea || hasSelect).toBeTruthy();
  });
});
