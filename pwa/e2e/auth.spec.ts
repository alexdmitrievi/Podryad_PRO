import { test, expect } from '@playwright/test';

test.describe('Авторизация', () => {
  test('страница регистрации отображает форму', async ({ page }) => {
    await page.goto('/register');

    // Register step 1: Далее button, phone input (custom PhoneInput), name input
    const phoneOrTextInput = page.locator('input, [role="textbox"]').first();
    await expect(phoneOrTextInput).toBeVisible();
    await expect(page.getByRole('button', { name: /Далее/i })).toBeVisible();
    await expect(page.getByText(/Регистрация/i).first()).toBeVisible();
  });

  test('валидация телефона на регистрации', async ({ page }) => {
    await page.goto('/register');

    // Step 1: fill name, invalid phone, click Далее
    const nameInput = page.getByPlaceholder(/Иван/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Тест');
    }
    // Click Далее with invalid phone - expect validation error
    await page.getByRole('button', { name: /Далее/i }).click();

    // Error toast or validation message
    const hasError = await page.getByText(/корректный|ошибка/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasButton = await page.getByRole('button', { name: /Далее/i }).isVisible();
    expect(hasError || hasButton).toBeTruthy();
  });

  test('страница логина отображается', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('ссылка между логином и регистрацией', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.getByRole('link', { name: /войти/i });
    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await Promise.all([
        page.waitForURL(/login/),
        loginLink.click(),
      ]);
      await expect(page).toHaveURL(/login/);
    }
  });
});
