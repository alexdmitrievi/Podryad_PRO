'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_RATES, type Rate } from '@/lib/rates';

const WORK_TYPE_OPTIONS = [
  { value: 'грузчики', label: '💪 Грузчики' },
  { value: 'уборка', label: '🧹 Уборка' },
  { value: 'стройка', label: '🏗 Стройка' },
  { value: 'разнорабочие', label: '🔧 Разнорабочие' },
  { value: 'другое', label: '📋 Другое' },
];

export default function CostCalculator() {
  const [rates, setRates] = useState<Rate[]>(DEFAULT_RATES);
  const [workType, setWorkType] = useState('грузчики');
  const [rateInput, setRateInput] = useState('');
  const [people, setPeople] = useState(2);
  const [hours, setHours] = useState(4);

  useEffect(() => {
    fetch('/api/rates')
      .then((r) => r.json())
      .then(setRates)
      .catch(() => setRates(DEFAULT_RATES));
  }, []);

  const suggestedRate = rates.find((r) => r.work_type === workType)?.client_rate ?? 600;
  const rate = rateInput !== '' ? parseInt(rateInput, 10) || 0 : suggestedRate;
  const effectiveHours = Math.max(hours, rates.find((r) => r.work_type === workType)?.min_hours ?? 1);
  const clientTotal = rate * people * effectiveHours;
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 space-y-4">
      <h3 className="font-bold text-lg">💰 Сколько стоит?</h3>
      <p className="text-gray-500 text-sm">
        Выберите параметры — цена рассчитается автоматически
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Тип работы
        </label>
        <div className="flex flex-wrap gap-2">
          {WORK_TYPE_OPTIONS.map((wt) => (
            <button
              key={wt.value}
              type="button"
              onClick={() => setWorkType(wt.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${workType === wt.value
                  ? 'bg-[#0088cc] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {wt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          💰 Ставка за час (₽) — индивидуально по заказу
        </label>
        <input
          type="number"
          min={300}
          max={2000}
          step={50}
          placeholder={`пример: ${suggestedRate}`}
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Укажите вашу ставку или выберите тип — подставится ориентир
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            👥 Людей
          </label>
          <select
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} чел.
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🕐 Часов
          </label>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} ч.
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#0088cc]/10 to-[#005580]/10 rounded-xl p-4">
        <p className="text-sm text-gray-600 mb-1">Стоимость для заказчика:</p>
        <p className="text-2xl font-bold text-[#0088cc]">
          {clientTotal.toLocaleString()}₽
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {rate}₽/час за чел. × {people} чел × {effectiveHours} ч
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href={`https://t.me/${botName}`}
          className="flex-1 text-center bg-[#0088cc] text-white font-bold py-3 px-4 rounded-xl
                     hover:bg-[#0077b3] transition-colors text-sm"
        >
          Заказать в боте
        </a>
        <Link
          href="/app/order"
          className="flex-1 text-center bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl
                     hover:bg-gray-200 transition-colors text-sm"
        >
          Через форму
        </Link>
      </div>
    </div>
  );
}
