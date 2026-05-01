/**
 * Full customer (заказчик) journey:
 *   1. Register at /register (2-step form: info → password)
 *   2. Land on /account (личный кабинет)
 *   3. Open /order/new and submit a labor order
 *   4. Confirm success state
 *   5. Browse public order feed at /dashboard
 *
 * Backend (Supabase + n8n) is not reachable in CI — we mock the relevant
 * API routes with `page.route()` so the UI flow can be exercised end-to-end.
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_PHONE = '+7 (999) 123-45-67';
const TEST_RAW_PHONE = '79991234567';
const TEST_NAME = 'Иван Тестов';
const TEST_PASSWORD = 'TestPass1';

async function mockCustomerApis(page: Page) {
  // Registration
  await page.route('**/api/auth/register', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: { id: 'cust-1', phone: TEST_RAW_PHONE, name: TEST_NAME },
      }),
    }),
  );

  // Login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, user: { id: 'cust-1', phone: TEST_RAW_PHONE } }),
    }),
  );

  // Account profile / orders list (used by /account)
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        customer: {
          id: 'cust-1',
          phone: TEST_RAW_PHONE,
          name: TEST_NAME,
          customer_type: 'personal',
          org_name: null,
          inn: null,
          city: 'omsk',
          preferred_contact: null,
          created_at: new Date().toISOString(),
        },
      }),
    }),
  );

  await page.route('**/api/account', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orders: [] }),
    }),
  );

  // Order create (POST /api/orders)
  await page.route('**/api/orders', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, order_id: 'ord-test-1' }),
      });
    }
    return route.continue();
  });

  // Public orders feed used by /dashboard
  await page.route('**/api/orders/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orders: [
          {
            id: 'ord-1',
            work_type: 'labor',
            address: 'Омск, ул. Ленина 1',
            address_lat: 54.989,
            address_lng: 73.368,
            display_price: 5000,
            city: 'omsk',
            created_at: new Date().toISOString(),
          },
        ],
      }),
    }),
  );
}

test.describe('Полный путь заказчика', () => {
  test.beforeEach(async ({ page }) => {
    await mockCustomerApis(page);
  });

  test('1. Регистрация: 2-шаговая форма info → password', async ({ page }) => {
    await page.goto('/register');

    // Step 1: info
    await expect(page.getByRole('heading', { name: /регистрация/i })).toBeVisible();
    await page.locator('input[autocomplete="name"]').fill(TEST_NAME);
    await page.getByPlaceholder(/\+7/).pressSequentially('9991234567');
    await page.getByRole('button', { name: /далее/i }).click();

    // Step 2: password
    await expect(page.getByRole('button', { name: /зарегистрироваться/i })).toBeVisible();
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();

    // Redirect to /account
    await expect(page).toHaveURL(/\/account/, { timeout: 10000 });
  });

  test('2. Валидация пароля: слабый пароль не пропускается', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[autocomplete="name"]').fill(TEST_NAME);
    await page.getByPlaceholder(/\+7/).pressSequentially('9991234567');
    await page.getByRole('button', { name: /далее/i }).click();

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('short');
    await passwordInputs.nth(1).fill('short');
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();

    // toast: "Пароль минимум 8 символов"
    await expect(page.getByText(/минимум 8 символов/i)).toBeVisible({ timeout: 3000 });
  });

  test('3. Бизнес-регистрация требует название организации', async ({ page }) => {
    await page.goto('/register');

    await page.getByRole('button', { name: /бизнес/i }).click();
    await page.locator('input[autocomplete="name"]').fill(TEST_NAME);
    await page.getByPlaceholder(/\+7/).pressSequentially('9991234567');
    // Не заполняем "Организация / ИП"
    await page.getByRole('button', { name: /далее/i }).click();

    await expect(page.getByText(/название организации/i)).toBeVisible({ timeout: 3000 });
  });

  test('4. Размещение заказа: форма /order/new работает', async ({ page }) => {
    await page.goto('/order/new');

    await expect(page.getByRole('heading', { name: /разместить заказ/i })).toBeVisible();

    // Категория «Рабочие»
    await page.getByRole('button', { name: /^рабочие$/i }).first().click();
    // Подкатегория
    await page.getByRole('button', { name: /^грузчики$/i }).first().click();

    // Адрес (placeholder "Введите адрес...")
    await page.getByPlaceholder(/введите адрес/i).fill('Омск, ул. Ленина 1');
    // Телефон
    await page.getByPlaceholder(/\+7/).pressSequentially('9991234567');

    // Согласие 152-ФЗ — единственный чекбокс в форме
    const consent = page.locator('form input[type="checkbox"]').first();
    await consent.scrollIntoViewIfNeeded();
    await consent.click();
    await expect(consent).toBeChecked();

    // Submit — на десктопе кнопка внутри формы, на мобилке sticky-кнопка снаружи (form="order-form")
    const submit = page
      .locator('button[type="submit"]', { hasText: /разместить заказ/i })
      .filter({ visible: true })
      .first();
    await submit.click();

    // success state
    await expect(page.getByText(/заказ создан/i)).toBeVisible({ timeout: 10000 });
  });

  test('5. Лента заказов /dashboard рендерится', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /разместить заказ/i })).toBeVisible();
    // На карте должен показаться счётчик заказов
    await expect(page.locator('span').filter({ hasText: /заказ.* на карте/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('6. Личный кабинет /account отображает профиль', async ({ page }) => {
    await page.goto('/account');
    // Имя или телефон или вкладки видны
    await expect(page.locator('body')).toBeVisible();
    const visible = await Promise.race([
      page.getByText(TEST_NAME).first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
      page.getByRole('button', { name: /заказы|профиль/i }).first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
    ]);
    expect(visible).toBeTruthy();
  });
});
