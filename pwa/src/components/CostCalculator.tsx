'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  WORK_TYPES,
  calculateCost,
  type WorkType,
} from '@/lib/rates';

const LABELS: Record<WorkType, string> = {
  грузчики: 'Грузчики',
  уборка: 'Уборка',
  стройка: 'Стройка',
  разнорабочие: 'Разнорабочие',
  другое: 'Другое',
};

export default function CostCalculator() {
  const [workType, setWorkType] = useState<WorkType>('грузчики');
  const [people, setPeople] = useState(2);
  const [hours, setHours] = useState(6);

  const result = useMemo(
    () => calculateCost(workType, people, hours),
    [workType, people, hours]
  );

  const totalFormatted = result.client_total.toLocaleString('ru-RU');
  const rateFormatted = result.client_rate.toLocaleString('ru-RU');

  return (
    <div className="card-premium p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Рассчитать стоимость</h3>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">Двигайте ползунки — цена обновится сразу</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {WORK_TYPES.map((wt) => (
          <button
            key={wt}
            type="button"
            onClick={() => setWorkType(wt)}
            className={`
              rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-200
              ${workType === wt
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border/80'}
            `}
          >
            {LABELS[wt]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Людей</span>
          <span className="font-semibold text-gray-900 dark:text-white">{people}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={people}
          onChange={(e) => setPeople(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Часов</span>
          <span className="font-semibold text-gray-900 dark:text-white">{hours}</span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
      </div>

      <div className="bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-brand-100 dark:border-brand-800/30">
        <p className="text-gray-900 dark:text-white font-bold text-lg tabular-nums">
          Стоимость: {totalFormatted}₽
        </p>
        <p className="text-gray-500 dark:text-dark-muted text-sm mt-1">
          ({rateFormatted}₽/час × {result.people} чел × {result.effective_hours} ч)
        </p>
      </div>

      <Link
        href="/auth/register"
        className="
          flex items-center justify-center gap-2 w-full
          bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold py-3.5 px-4 rounded-2xl
          hover:from-brand-600 hover:to-brand-700 active:scale-[0.98]
          transition-all duration-200 text-sm shadow-lg shadow-brand-500/20
        "
      >
        Заказать за {totalFormatted}₽ →
      </Link>
    </div>
  );
}
