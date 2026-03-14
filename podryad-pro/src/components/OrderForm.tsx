'use client';

import { useState, type FormEvent } from 'react';

const WORK_TYPES = [
  { value: 'грузчики', label: '📦 Грузчики' },
  { value: 'уборка', label: '🧹 Уборка' },
  { value: 'стройка', label: '🏗 Стройка' },
  { value: 'другое', label: '📋 Другое' },
];

interface FormData {
  address: string;
  time: string;
  payment: string;
  people: number;
  hours: number;
  work_type: string;
  comment: string;
}

export default function OrderForm() {
  const [form, setForm] = useState<FormData>({
    address: '',
    time: '',
    payment: '',
    people: 1,
    hours: 1,
    work_type: 'грузчики',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
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
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Ошибка отправки');

      setSuccess(true);
      setForm({
        address: '',
        time: '',
        payment: '',
        people: 1,
        hours: 1,
        work_type: 'грузчики',
        comment: '',
      });
    } catch {
      setError('Не удалось отправить заказ. Попробуйте через Telegram-бота.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
        <p className="text-4xl">✅</p>
        <h3 className="text-lg font-bold text-green-800">Заказ отправлен!</h3>
        <p className="text-sm text-green-700">
          Мы обработаем вашу заявку и опубликуем в канале после оплаты.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="bg-brand-blue text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-blue-dark transition-colors"
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
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="г. Омск, ул. Ленина, 10"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ⏰ Дата и время
          </label>
          <input
            type="datetime-local"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            💰 Оплата
          </label>
          <input
            type="text"
            value={form.payment}
            onChange={(e) => setForm({ ...form, payment: e.target.value })}
            placeholder="1500р/час"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            👥 Людей
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={form.people}
            onChange={(e) => setForm({ ...form, people: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🕐 Часов
          </label>
          <input
            type="number"
            min={1}
            max={24}
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
          />
        </div>
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
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                form.work_type === wt.value
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-blue'
              }`}
            >
              {wt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          💬 Комментарий
        </label>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="Переезд, 3 этаж без лифта..."
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-blue text-white py-3 rounded-xl font-bold text-lg hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Отправка...' : '📝 Создать заказ — 500₽'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Или напишите боту напрямую:{' '}
        <a
          href="https://t.me/Podryad_PRO_bot"
          className="text-brand-blue hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          @Podryad_PRO_bot
        </a>
      </p>
    </form>
  );
}
