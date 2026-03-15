/**
 * Тарифная сетка Подряд PRO v3 (outstaffing)
 * client_rate — для заказчика, worker_rate — для исполнителя
 */

export interface Rate {
  work_type: string;
  client_rate: number;
  worker_rate: number;
  margin: number;
  min_hours: number;
}

export const DEFAULT_RATES: Rate[] = [
  { work_type: 'грузчики', client_rate: 700, worker_rate: 500, margin: 200, min_hours: 2 },
  { work_type: 'уборка', client_rate: 600, worker_rate: 400, margin: 200, min_hours: 2 },
  { work_type: 'стройка', client_rate: 900, worker_rate: 650, margin: 250, min_hours: 3 },
  { work_type: 'разнорабочие', client_rate: 650, worker_rate: 450, margin: 200, min_hours: 2 },
  { work_type: 'другое', client_rate: 600, worker_rate: 400, margin: 200, min_hours: 1 },
];

export const WORK_TYPES = [
  'грузчики',
  'уборка',
  'стройка',
  'разнорабочие',
  'другое',
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export interface CostResult {
  client_rate: number;
  worker_rate: number;
  client_total: number;
  worker_payout: number;
  margin: number;
  effective_hours: number;
  people: number;
}

export function calculateCost(
  workType: string,
  people: number,
  hours: number,
  rates: Rate[] = DEFAULT_RATES
): CostResult {
  const rate =
    rates.find((r) => r.work_type === workType) || rates[rates.length - 1];
  const effectiveHours = Math.max(hours, rate.min_hours);

  return {
    client_rate: rate.client_rate,
    worker_rate: rate.worker_rate,
    client_total: rate.client_rate * people * effectiveHours,
    worker_payout: rate.worker_rate * people * effectiveHours,
    margin: rate.margin * people * effectiveHours,
    effective_hours: effectiveHours,
    people,
  };
}
