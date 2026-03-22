import { describe, it, expect } from 'vitest';
import { orderFromDb, validateWorkerAccess } from '../db';

describe('orderFromDb', () => {
  it('преобразует строку БД в Order', () => {
    const row = {
      order_id: 'n8n-123',
      customer_id: '12345',
      address: 'ул. Ленина 50',
      lat: '54.98',
      lon: '73.37',
      yandex_link: 'https://yandex.ru/maps/...',
      time: '10:00',
      payment_text: '700₽/час × 2 чел × 3 ч',
      people: 2,
      hours: 3,
      work_type: 'грузчики',
      comment: 'тест',
      status: 'published',
      executor_id: null,
      message_id: null,
      created_at: '2025-01-01T00:00:00Z',
      client_rate: 700,
      worker_rate: 500,
      client_total: 4200,
      worker_payout: 3000,
      margin: 1200,
      payout_status: null,
      payout_at: null,
      max_posted: false,
      max_message_id: null,
    };
    const order = orderFromDb(row);
    expect(order.order_id).toBe('n8n-123');
    expect(order.lat).toBe(54.98);
    expect(order.lon).toBe(73.37);
    expect(order.people).toBe(2);
    expect(order.status).toBe('published');
    expect(order.executor_id).toBeUndefined();
    expect(order.client_total).toBe(4200);
    expect(order.max_posted).toBe(false);
  });

  it('обрабатывает пустой order_id', () => {
    const row = { order_id: null };
    const order = orderFromDb(row as Record<string, unknown>);
    expect(order.order_id).toBe('');
  });

  it('обрабатывает отсутствующие числовые поля', () => {
    const row = { people: null, hours: undefined, lat: 'not-a-number' };
    const order = orderFromDb(row as Record<string, unknown>);
    expect(order.people).toBe(0);
    expect(order.hours).toBe(0);
    expect(order.lat).toBe(0);
  });
});

describe('validateWorkerAccess', () => {
  it('пропускает валидного воркера', () => {
    const worker = { white_list: true, ban_until: null, rating: 4.5, jobs_count: 10 };
    expect(validateWorkerAccess(worker)).toBeNull();
  });

  it('блокирует не в белом списке', () => {
    const worker = { white_list: false, ban_until: null, rating: 5.0, jobs_count: 0 };
    expect(validateWorkerAccess(worker)).toContain('белом списке');
  });

  it('блокирует забаненного', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const worker = { white_list: true, ban_until: future, rating: 5.0, jobs_count: 0 };
    expect(validateWorkerAccess(worker)).toContain('заблокированы');
  });

  it('блокирует низкий рейтинг после 5 заказов', () => {
    const worker = { white_list: true, ban_until: null, rating: 3.5, jobs_count: 5 };
    expect(validateWorkerAccess(worker)).toContain('рейтинг');
  });

  it('не блокирует низкий рейтинг при < 5 заказах', () => {
    const worker = { white_list: true, ban_until: null, rating: 3.5, jobs_count: 4 };
    expect(validateWorkerAccess(worker)).toBeNull();
  });
});
