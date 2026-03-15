'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_RATES, type Rate } from '@/lib/rates';

const WORK_TYPES = [
  { value: 'грузчики', label: '💪 Грузчики' },
  { value: 'уборка', label: '🧹 Уборка' },
  { value: 'стройка', label: '🏗 Строительство' },
  { value: 'разнорабочие', label: '🔧 Разнорабочие' },
  { value: 'другое', label: '📋 Другое' },
];

export default function OrderForm() {
  const [rates, setRates] = useState<Rate[]>(DEFAULT_RATES);
  const [form, setForm] = useState({
    address: '',
    time: '',
    people: '2',
    hours: '2',
    work_type: 'грузчики',
    rate: '',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rates')
      .then((r) => r.json())
      .then(setRates)
      .catch(() => setRates(DEFAULT_RATES));
  }, []);

  const people = parseInt(form.people, 10) || 1;
  const hours = parseInt(form.hours, 10) || 1;
  const suggestedRate = rates.find((r) => r.work_type === form.work_type)?.client_rate ?? 600;
  const rate = form.rate !== '' ? parseInt(form.rate, 10) || 0 : suggestedRate;
  const minHours = rates.find((r) => r.work_type === form.work_type)?.min_hours ?? 1;
  const effectiveHours = Math.max(hours, minHours);
  const clientTotal = rate * people * effectiveHours;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.address.trim()) {
      setError('Укажите адрес');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: form.address.trim(),
          work_type: form.work_type,
          time: form.time || undefined,
          people,
          hours,
          client_rate: rate,
          comment: form.comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка отправки');
      }

      setSuccess(true);
      setForm({
        address: '',
        time: '',
        people: '2',
        hours: '2',
        work_type: 'грузчики',
        rate: '',
        comment: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
        <p className="text-4xl">✅</p>
        <p className="font-bold text-green-800 text-lg">Заявка отправлена!</p>
        <p className="text-green-600 text-sm">
          Вам придёт ссылка на оплату {clientTotal.toLocaleString()}₽ — после оплаты заказ
          опубликуем в канале.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-xl font-medium
                     hover:bg-green-700 transition-colors"
        >
          Создать ещё
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          📍 Адрес *
        </label>
        <input
          type="text"
          placeholder="ул. Ленина, 50, Омск"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                     focus:ring-2 focus:ring-[#0088cc] focus:border-transparent
                     outline-none transition-all text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          📋 Тип работы
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WORK_TYPES.map((wt) => (
            <button
              key={wt.value}
              type="button"
              onClick={() => setForm({ ...form, work_type: wt.value })}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${form.work_type === wt.value
                  ? 'bg-[#0088cc] text-white shadow-sm'
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
          ⏰ Когда
        </label>
        <input
          type="datetime-local"
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                     focus:ring-2 focus:ring-[#0088cc] focus:border-transparent
                     outline-none transition-all text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            👥 Людей
          </label>
          <select
            value={form.people}
            onChange={(e) => setForm({ ...form, people: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       focus:ring-2 focus:ring-[#0088cc] focus:border-transparent
                       outline-none transition-all text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
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
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       focus:ring-2 focus:ring-[#0088cc] focus:border-transparent
                       outline-none transition-all text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} ч.
              </option>
            ))}
          </select>
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
          value={form.rate}
          onChange={(e) => setForm({ ...form, rate: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                     focus:ring-2 focus:ring-[#0088cc] focus:border-transparent
                     outline-none transition-all text-sm"
        />
      </div>

      <div className="bg-[#0088cc]/5 rounded-xl p-4 border border-[#0088cc]/20">
        <p className="text-sm text-gray-600">Стоимость:</p>
        <p className="text-xl font-bold text-[#0088cc]">
          {clientTotal.toLocaleString()}₽
        </p>
        <p className="text-xs text-gray-500">
          {rate}₽/час за чел. × {people} чел × {effectiveHours} ч
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          💬 Комментарий
        </label>
        <textarea
          placeholder="Дополнительные детали..."
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                     focus:ring-2 focus:ring-[#0088cc] focus:border-transparent
                     outline-none transition-all text-sm resize-none"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">
          ⚠️ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0088cc] text-white font-bold py-3.5 rounded-xl text-base
                   hover:bg-[#0077b3] active:scale-[0.98] transition-all shadow-sm
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '⏳ Отправка...' : `📝 Отправить заявку — ${clientTotal.toLocaleString()}₽`}
      </button>

      <p className="text-gray-400 text-xs text-center">
        После отправки вам придёт ссылка на оплату
      </p>
    </form>
  );
}
