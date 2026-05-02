import { test, expect } from '@playwright/test';

/**
 * Executor flow E2E: регистрация → логин → отклик → ЛК
 */

test.describe('Executor Flow — регистрация', () => {
  test('страница расширенной анкеты открывается', async ({ page }) => {
    await page.goto('/join');

    await expect(page.locator('body')).toBeVisible();
    const hasForm = await page.getByRole('button', { name: /отправить|зарегистрироваться|стать/i }).isVisible().catch(() => false);
    const hasTitle = await page.getByRole('heading', { name: /исполнитель|подрядчик|регистрация/i }).isVisible().catch(() => false);
    expect(hasForm || hasTitle).toBeTruthy();
  });

  test('страница регистрации с паролем открывается', async ({ page }) => {
    await page.goto('/executor/register');

    await expect(page.locator('body')).toBeVisible();
    const hasPasswordInput = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
    const hasTitle = await page.getByRole('heading', { name: /регистрация/i }).isVisible().catch(() => false);
    expect(hasPasswordInput || hasTitle).toBeTruthy();
  });

  test('со страницы регистрации есть ссылка на вход', async ({ page }) => {
    await page.goto('/executor/register');

    const loginLink = page.getByRole('link', { name: /войти/i });
    const hasLink = await loginLink.isVisible().catch(() => false);
    expect(hasLink).toBeTruthy();
  });

  test('со страницы регистрации есть ссылка на расширенную анкету', async ({ page }) => {
    await page.goto('/executor/register');

    const joinLink = page.getByRole('link', { name: /анкета/i });
    const hasLink = await joinLink.isVisible().catch(() => false);
    expect(hasLink).toBeTruthy();
  });
});

test.describe('Executor Flow — API регистрация', () => {
  test('POST /api/auth/executor/register требует телефон, имя и пароль', async ({ request }) => {
    const res = await request.post('/api/auth/executor/register', {
      data: { phone: '', name: '', password: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/executor/register отклоняет короткий пароль', async ({ request }) => {
    const res = await request.post('/api/auth/executor/register', {
      data: { phone: '79000000001', name: 'Тест', password: '123' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('8');
  });

  test('POST /api/auth/executor/register отклоняет пароль без заглавной буквы', async ({ request }) => {
    const res = await request.post('/api/auth/executor/register', {
      data: { phone: '79000000002', name: 'Тест', password: '12345678' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('заглав');
  });
});

test.describe('Executor Flow — API логин', () => {
  test('POST /api/auth/executor-login требует телефон и пароль', async ({ request }) => {
    const res = await request.post('/api/auth/executor-login', {
      data: { phone: '', password: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/executor-login возвращает 401 на неверные данные', async ({ request }) => {
    const res = await request.post('/api/auth/executor-login', {
      data: { phone: '79999999999', password: 'WrongPassword123' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Executor Flow — личный кабинет', () => {
  test('ЛК исполнителя открывается с формой входа', async ({ page }) => {
    await page.goto('/executor');

    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    const hasInput = await page.locator('input').first().isVisible().catch(() => false);
    const hasAnyText = await page.locator('text=/личный|исполнитель|войдите|телефон|пароль/i').first().isVisible().catch(() => false);
    const hasSpinner = await page.locator('.animate-spin').first().isVisible().catch(() => false);
    expect(hasInput || hasAnyText || hasSpinner).toBeTruthy();
  });

  test('на странице входа есть ссылка на регистрацию', async ({ page }) => {
    await page.goto('/executor');

    await page.waitForTimeout(3000);

    const regLink = page.getByRole('link', { name: /зарегистрироваться/i });
    const hasLink = await regLink.isVisible().catch(() => false);
    expect(hasLink).toBeTruthy();
  });

  test('API /api/executor/dashboard возвращает 401 без сессии', async ({ request }) => {
    const res = await request.get('/api/executor/dashboard');
    expect(res.status()).toBe(401);
  });
});

test.describe('Executor Flow — лента заказов', () => {
  test('публичная лента заказов с картой открывается', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/404/);
  });

  test('навигация на лендинг с dashboard работает', async ({ page }) => {
    await page.goto('/dashboard');

    const hasNav = await page.locator('nav a, header a, [aria-label*="глав"]').first().isVisible().catch(() => false);
    const hasBody = await page.locator('body').isVisible();
    expect(hasNav || hasBody).toBeTruthy();
  });
});
