import { describe, it, expect } from 'vitest';
import { calculateCost, DEFAULT_RATES } from '../rates';

describe('calculateCost', () => {
  it('рассчитывает стоимость грузчиков', () => {
    const result = calculateCost('грузчики', 2, 3);
    expect(result.client_rate).toBe(700);
    expect(result.worker_rate).toBe(500);
    expect(result.client_total).toBe(700 * 2 * 3);
    expect(result.worker_payout).toBe(500 * 2 * 3);
    expect(result.margin).toBe(200 * 2 * 3);
    expect(result.people).toBe(2);
    expect(result.effective_hours).toBe(3);
  });

  it('применяет min_hours для уборки (min=2)', () => {
    const result = calculateCost('уборка', 1, 1);
    expect(result.effective_hours).toBe(2);
    expect(result.client_total).toBe(600 * 1 * 2);
  });

  it('применяет min_hours для стройки (min=3)', () => {
    const result = calculateCost('стройка', 1, 1);
    expect(result.effective_hours).toBe(3);
    expect(result.client_total).toBe(900 * 1 * 3);
  });

  it('использует последний тариф для неизвестного типа', () => {
    const result = calculateCost('неизвестный', 1, 1);
    const lastRate = DEFAULT_RATES[DEFAULT_RATES.length - 1];
    expect(result.client_rate).toBe(lastRate.client_rate);
  });

  it('работает с кастомными тарифами', () => {
    const customRates = [
      { work_type: 'test', client_rate: 1000, worker_rate: 800, margin: 200, min_hours: 1 },
    ];
    const result = calculateCost('test', 3, 5, customRates);
    expect(result.client_total).toBe(1000 * 3 * 5);
    expect(result.worker_payout).toBe(800 * 3 * 5);
  });
});

describe('DEFAULT_RATES', () => {
  it('содержит 5 тарифов', () => {
    expect(DEFAULT_RATES).toHaveLength(5);
  });

  it('маржа = client_rate - worker_rate для каждого тарифа', () => {
    for (const rate of DEFAULT_RATES) {
      expect(rate.margin).toBe(rate.client_rate - rate.worker_rate);
    }
  });

  it('min_hours >= 1 для всех тарифов', () => {
    for (const rate of DEFAULT_RATES) {
      expect(rate.min_hours).toBeGreaterThanOrEqual(1);
    }
  });
});
