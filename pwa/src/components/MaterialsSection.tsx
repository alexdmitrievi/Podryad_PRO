'use client';

import { FormEvent, useState } from 'react';
import { Layers, Droplets, Flame, Mountain, Waves, Package, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MATERIALS: { Icon: LucideIcon; name: string; color: string; bg: string }[] = [
  { Icon: Layers,   name: 'Бетон любых марок',               color: 'text-slate-300',  bg: 'bg-slate-500/20' },
  { Icon: Droplets, name: 'Битум БНД 100/130',               color: 'text-amber-300',  bg: 'bg-amber-500/20' },
  { Icon: Flame,    name: 'Печное топливо тёмное / светлое', color: 'text-orange-300', bg: 'bg-orange-500/20' },
  { Icon: Mountain, name: 'Щебень любых марок',              color: 'text-blue-300',   bg: 'bg-blue-500/20' },
  { Icon: Waves,    name: 'Песок',                           color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
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
      <div className="relative z-10 w-full max-w-md mx-auto px-4">

        {/* Heading */}
        <div className="text-center mb-8">
          <span className="badge-brand-hero inline-flex items-center gap-2 mb-4">
            <Package size={14} className="shrink-0" />
            Строительные материалы
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Заказать материалы
          </h2>
          <p className="text-white/60 mt-3 text-sm md:text-base max-w-xs mx-auto">
            Доставка по Омску и Новосибирску. Оставьте номер — перезвоним и рассчитаем.
          </p>
        </div>

        {/* Materials card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4">
          <ul className="space-y-2">
            {MATERIALS.map((m) => (
              <li key={m.name} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                  <m.Icon size={16} className={m.color} />
                </div>
                <span className="text-sm font-medium text-white leading-tight">{m.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form / Success */}
        {done ? (
          <div className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
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
              className="w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3.5 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/30 transition-shadow"
            />
            {error && (
              <p className="text-red-300 text-xs px-1">{error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 shadow-sm cursor-pointer"
            >
              {pending ? 'Отправляем...' : 'Получить расчёт'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
