'use client';

import { useState } from 'react';
import {
  MapPin, Clock, Users, Timer,
  MessageCircle, CheckCircle2, Loader2, AlertCircle,
  Send, RotateCcw,
} from 'lucide-react';

const WORK_TYPES = [
  { value: 'грузчики',     label: 'Грузчики',       emoji: '💪' },
  { value: 'уборка',       label: 'Уборка',         emoji: '🧹' },
  { value: 'стройка',      label: 'Строительство',  emoji: '🏗' },
  { value: 'разнорабочие', label: 'Разнорабочие',   emoji: '🔧' },
  { value: 'другое',       label: 'Другое',         emoji: '📋' },
];

export default function OrderForm() {
  const [form, setForm] = useState({
    address: '',
    time: '',
    people: '2',
    hours: '2',
    work_type: 'грузчики',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const people = parseInt(form.people, 10) || 1;
  const hours = parseInt(form.hours, 10) || 1;

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
          comment: form.comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка отправки');
      }

      setSuccess(true);
      setForm({ address: '', time: '', people: '2', hours: '2', work_type: 'грузчики', comment: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h3 className="font-bold text-emerald-900 text-xl">Заявка отправлена!</h3>
        <p className="text-emerald-700 text-sm leading-relaxed max-w-xs mx-auto">
          Мы рассчитаем стоимость и пришлём вам предложение через бота.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="
            inline-flex items-center gap-2 mt-2
            bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-semibold text-sm
            hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200
          "
        >
          <RotateCcw size={16} />
          Создать ещё
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Address */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
          <MapPin size={15} className="text-brand-500" />
          Адрес
          <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="ул. Ленина, 50, Омск"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="
            w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white
            focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
            outline-none transition-all duration-200 text-sm
            placeholder:text-gray-300
          "
          required
        />
      </fieldset>

      {/* Work type */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
          Тип работы
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WORK_TYPES.map((wt) => (
            <button
              key={wt.value}
              type="button"
              onClick={() => setForm({ ...form, work_type: wt.value })}
              className={`
                flex items-center gap-2 px-3.5 py-3 rounded-2xl text-sm font-medium
                transition-all duration-200 border active:scale-[0.98]
                ${form.work_type === wt.value
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-200 hover:bg-brand-50'}
              `}
            >
              <span className="text-base">{wt.emoji}</span>
              {wt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Date/time */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
          <Clock size={15} className="text-brand-500" />
          Когда
        </label>
        <input
          type="datetime-local"
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
          className="
            w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white
            focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
            outline-none transition-all duration-200 text-sm
          "
        />
      </fieldset>

      {/* People + Hours */}
      <div className="grid grid-cols-2 gap-3">
        <fieldset>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
            <Users size={15} className="text-brand-500" />
            Людей
          </label>
          <select
            value={form.people}
            onChange={(e) => setForm({ ...form, people: e.target.value })}
            className="
              w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white
              focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
              outline-none transition-all duration-200 text-sm appearance-none
              bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
              bg-[length:12px] bg-[right_16px_center] bg-no-repeat
            "
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
              <option key={n} value={n}>{n} чел.</option>
            ))}
          </select>
        </fieldset>
        <fieldset>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
            <Timer size={15} className="text-brand-500" />
            Часов
          </label>
          <select
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            className="
              w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white
              focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
              outline-none transition-all duration-200 text-sm appearance-none
              bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
              bg-[length:12px] bg-[right_16px_center] bg-no-repeat
            "
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>{n} ч.</option>
            ))}
          </select>
        </fieldset>
      </div>

      {/* Comment */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
          <MessageCircle size={15} className="text-brand-500" />
          Комментарий
        </label>
        <textarea
          placeholder="Дополнительные детали..."
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          className="
            w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white
            focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
            outline-none transition-all duration-200 text-sm resize-none
            placeholder:text-gray-300
          "
        />
      </fieldset>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-2xl border border-red-100 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full flex items-center justify-center gap-2.5
          bg-brand-500 text-white font-bold py-4 rounded-2xl text-base
          hover:bg-brand-600 active:scale-[0.98]
          transition-all duration-200 shadow-sm shadow-brand-500/20
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Отправка...
          </>
        ) : (
          <>
            <Send size={18} />
            Отправить заявку на расчёт
          </>
        )}
      </button>

      <p className="text-gray-400 text-xs text-center">
        После отправки вам придёт ссылка на оплату через бота
      </p>
    </form>
  );
}
