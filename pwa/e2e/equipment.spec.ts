import { test, expect } from '@playwright/test';

test.describe('Аренда техники', () => {
  test('каталог загружается с фильтрами', async ({ page }) => {
    await page.goto('/equipment');

    // Кнопки фильтров видны
    await expect(page.getByRole('button', { name: 'Все' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Сад/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Стройка/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Спец/i })).toBeVisible();
  });

  test('фильтрация по категории работает', async ({ page }) => {
    await page.goto('/equipment');

    // Запоминаем количество карточек
    const allCards = await page.locator('[class*="rounded-2xl"][class*="shadow"]').count();

    // Фильтруем по "Сад"
    await page.getByRole('button', { name: /Сад/i }).click();
    await expect(page).toHaveURL(/cat=garden/);

    // Карточек должно быть меньше или столько же
    const gardenCards = await page.locator('[class*="rounded-2xl"][class*="shadow"]').count();
    expect(gardenCards).toBeLessThanOrEqual(allCards);
  });

  test('баннер скидки 15% отображается', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.getByText(/скидка 15%/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /заказать исполнителей/i })).toBeVisible();
  });

  test('фильтр "Все" сбрасывает URL', async ({ page }) => {
    await page.goto('/equipment?cat=garden');
    await page.getByRole('button', { name: 'Все' }).click();
    await expect(page).toHaveURL('/equipment');
  });
});
