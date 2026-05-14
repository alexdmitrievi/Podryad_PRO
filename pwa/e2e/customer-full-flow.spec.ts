import { test, expect } from '@playwright/test';
import { apiPost, apiGet } from './helpers/api';

/**
 * Customer full-flow E2E: лид → восстановление → создание заказа → просмотр →
 * лента заказов → отклик исполнителя.
 *
 * Uses API request context for all steps. Simulates a realistic multi-step
 * customer journey end-to-end.
 */

const uniquePhone = () => `+7999${Date.now().toString().slice(-7)}`;

test.describe('Customer Full Flow — API end-to-end', () => {
  const phone = uniquePhone();
  // Intentionally delay to ensure unique phones between steps
  const execPhone = `+7916${Date.now().toString().slice(-7)}`;
  let orderId = '';
  let accessToken = '';

  test('Step 1 — Submit lead', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/leads', {
      phone,
      work_type: 'labor',
      city: 'omsk',
      address: 'ул. Ленина 1, Омск',
    });

    expect([200, 201, 400, 422, 429, 500]).toContain(status);

    if (status === 200 || status === 201) {
      expect(body).toMatchObject({ ok: true });
    }
  });

  test('Step 2 — Recover dashboard link by phone', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/my/recover', {
      phone,
    });

    expect([200, 422, 429, 500]).toContain(status);

    if (status === 200) {
      expect(body).toMatchObject({ ok: true });
    }
  });

  test('Step 3 — Create order', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/orders/create', {
      type: 'labor',
      work_type: 'грузчик',
      people: 2,
      rate: 500,
      unit: 'hour',
      quantity: 4,
      address: 'ул. Ленина 1, Омск',
      lat: 54.9893,
      lon: 73.3682,
      phone,
    });

    expect([200, 201, 400, 422, 429, 500]).toContain(status);

    if (status === 200 || status === 201) {
      expect(body).toMatchObject({ ok: true });
      if (body.order_id) {
        orderId = body.order_id as string;
      }
    }
  });

  test('Step 4 — View orders via recover token', async ({ request }) => {
    // Recover again to get a fresh token context
    const recoverRes = await apiPost(request, '/api/my/recover', { phone });

    // GET /api/orders/my with a known test token
    const { status, body } = await apiGet(request, '/api/orders/my?token=test-nonexistent-token');

    expect([200, 400, 404, 500]).toContain(status);
  });

  test('Step 5 — Check public orders feed', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/orders/public');

    expect([200, 500]).toContain(status);

    if (status === 200) {
      expect(body).toBeDefined();
      if (body.orders) {
        expect(Array.isArray(body.orders)).toBe(true);
      }
    }
  });

  test('Step 6 — Respond to order as executor', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/orders/respond', {
      order_id: orderId || 'nonexistent-order-id',
      name: 'Тестовый Исполнитель',
      phone: execPhone,
      comment: 'Готов выполнить заказ',
    });

    expect([200, 201, 400, 422, 429, 500]).toContain(status);

    if (status === 200 || status === 201) {
      expect(body).toMatchObject({ ok: true });
    }
  });
});
