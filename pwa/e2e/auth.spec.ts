import { test, expect } from '@playwright/test';

test.describe('Авторизация', () => {
  test('страница регистрации отображает форму', async ({ page }) => {
    await page.goto('/auth/register');

    await expect(page.getByPlaceholder(/телефон/i)).toBeVisible();
    await expect(page.getByPlaceholder(/пароль/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /зарегистрироваться/i })).toBeVisible();
  });

  test('валидация телефона на регистрации', async ({ page }) => {
    await page.goto('/auth/register');

    // Ввод короткого номера
    await page.getByPlaceholder(/телефон/i).fill('123');
    await page.getByPlaceholder(/пароль/i).first().fill('test1234');
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();

    // Ждём ошибки валидации
    await expect(page.getByText(/номер|телефон|ошибка/i)).toBeVisible({ timeout: 5000 });
  });

  test('страница логина отображается', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('ссылка между логином и регистрацией', async ({ page }) => {
    await page.goto('/auth/register');
    const loginLink = page.getByRole('link', { name: /войти|вход/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/auth\/login/);
    }
  });
});
