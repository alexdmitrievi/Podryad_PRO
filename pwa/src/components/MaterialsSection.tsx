'use client';

import { FormEvent, useState } from 'react';

const MATERIALS = [
  { emoji: '🏗️', name: 'Бетон любых марок' },
  { emoji: '🛢️', name: 'Битум БНД 100/130' },
  { emoji: '🔥', name: 'Печное топливо тёмное / светлое' },
  { emoji: '⛰️', name: 'Щебень любых марок' },
  { emoji: '🏖️', name: 'Песок' },
];

export default function MaterialsSection() {
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/materials/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === 'invalid_phone') {
          setError('Укажите корректный номер телефона');
        } else {
          setError('Не удалось отправить заявку. Попробуйте позже.');
        }
        return;
      }
      setDone(true);
    } catch {
      setError('Нет связи. Проверьте интернет и повторите.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="relative bg-gradient-to-br from-[#0a0c14] via-brand-900 to-brand-700 text-white overflow-hidden py-20 md:py-28">
      <div className="hero-pattern absolute inset-0" />
      <div className="relative z-10 max-w-2xl mx-auto px-5">

        {/* Heading */}
        <div className="text-center mb-10">
          <span className="badge-brand-hero inline-flex items-center gap-1.5 mb-4">
            📦 Строительные материалы
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Заказать материалы
          </h2>
          <p className="text-white/60 mt-3 text-sm md:text-base">
            Доставка по Омску и Новосибирску. Оставьте номер — перезвоним и рассчитаем.
          </p>
        </div>

        {/* Materials card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 md:p-8 mb-6">
          <ul className="space-y-3">
            {MATERIALS.map((m) => (
              <li key={m.name} className="flex items-center gap-3 text-sm md:text-base">
                <span className="text-xl leading-none shrink-0">{m.emoji}</span>
                <span className="font-medium text-white">{m.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form / Success */}
        {done ? (
          <div className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-bold text-lg">Заявка принята!</p>
            <p className="text-white/70 text-sm mt-1">
              Перезвоним в течение 15 минут
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-4 text-sm text-white placeholder-white/40 outline-none ring-brand-300 focus:ring-2 transition-shadow"
            />
            {error && (
              <p className="text-red-300 text-xs px-1">{error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-brand-500 py-4 text-sm font-bold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 shadow-sm"
            >
              {pending ? 'Отправляем...' : 'Получить расчёт'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
