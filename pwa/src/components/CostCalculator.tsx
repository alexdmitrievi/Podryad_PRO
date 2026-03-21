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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Calculator size={20} className="text-[#0088cc]" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900">Рассчитать стоимость</h3>
          <p className="text-xs text-gray-500 mt-0.5">Двигайте ползунки — цена обновится сразу</p>
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
                ? 'bg-[#0088cc] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
          >
            {LABELS[wt]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Людей</span>
          <span className="font-semibold text-gray-900">{people}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={people}
          onChange={(e) => setPeople(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0088cc]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Часов</span>
          <span className="font-semibold text-gray-900">{hours}</span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0088cc]"
        />
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
        <p className="text-gray-900 font-bold text-lg">
          Стоимость: {totalFormatted}₽
        </p>
        <p className="text-gray-500 text-sm mt-1">
          ({rateFormatted}₽/час × {result.people} чел × {result.effective_hours} ч)
        </p>
      </div>

      <Link
        href="/auth/register"
        className="
          flex items-center justify-center gap-2 w-full
          bg-[#0088cc] text-white font-bold py-3.5 px-4 rounded-2xl
          hover:opacity-95 active:scale-[0.98]
          transition-all duration-200 text-sm shadow-lg
        "
      >
        Заказать за {totalFormatted}₽ →
      </Link>
    </div>
  );
}
