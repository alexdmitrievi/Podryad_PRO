'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Banknote, Shield } from 'lucide-react';

const SPECIALIZATIONS = [
  'Грузчики', 'Разнорабочие', 'Уборка', 'Строительство',
  'Снос и демонтаж', 'Погрузка / разгрузка', 'Благоустройство',
  'Переезды', 'Садовые работы',
];

const CITIES = ['Омск', 'Новосибирск'];

export default function JoinPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Омск');
  const [inn, setInn] = useState('');
  const [specs, setSpecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function toggleSpec(s: string) {
    setSpecs((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Заполните имя и телефон');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerType: 'individual',
          name: name.trim(),
          phone: phone.replace(/\D/g, ''),
          city,
          specializations: specs,
          inn: inn.trim() || undefined,
        }),
      });
      if (res.status === 409) {
        setError('Этот номер уже зарегистрирован');
        return;
      }
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Ошибка регистрации');
        return;
      }
      setDone(true);
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center px-5 text-center gap-5">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Заявка принята!</h2>
        <p className="text-gray-500 dark:text-dark-muted max-w-sm leading-relaxed">
          Мы свяжемся с вами в течение рабочего дня для проверки и подтверждения.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
          >
            Перейти к заказам <ArrowRight size={16} />
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 py-2 text-center">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <span className="font-bold text-gray-900 dark:text-white">Регистрация исполнителя</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Trust pill */}
        <div className="flex items-center gap-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl px-5 py-4">
          <Banknote size={22} className="text-brand-500 shrink-0" />
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300 leading-snug">
            Бесплатно. Никаких комиссий. 100% ставки — ваши.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              ФИО <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Телефон <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Город <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    city === c
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-brand-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Specializations */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Специализации
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpec(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    specs.includes(s)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-brand-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* INN */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              ИНН самозанятого <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <input
              type="text"
              value={inn}
              onChange={(e) => setInn(e.target.value)}
              placeholder="123456789012"
              maxLength={12}
              className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
            />
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">
              Самозанятые получают заказы в приоритете
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-start gap-3 text-xs text-gray-400 dark:text-dark-muted pt-1">
            <Shield size={14} className="text-brand-500 shrink-0 mt-0.5" />
            Нажимая «Подать заявку», вы соглашаетесь с{' '}
            <Link href="/privacy" className="text-brand-500 hover:underline ml-1">
              условиями платформы
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? 'Отправляем...' : 'Подать заявку'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-dark-muted">
          Хотите зарегистрировать бригаду?{' '}
          <Link href="/join/crew" className="text-brand-500 hover:underline">
            Форма для бригад
          </Link>
        </p>
      </div>
    </div>
  );
}
