'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Tab = 'equipment' | 'labor' | 'materials';

interface OfferItem {
  title: string;
  meta: string;
  market: number;
  ours: number;
  unit: string;
  badge?: string;
}

const OFFERS: Record<Tab, OfferItem[]> = {
  equipment: [
    { title: 'Экскаватор-погрузчик JCB 3CX', meta: 'С оператором · от 4 часов', market: 2500, ours: 2000, unit: 'ч', badge: '−20%' },
    { title: 'Самосвал 15 т (КамАЗ)', meta: 'Доставка по городу', market: 1500, ours: 1200, unit: 'ч', badge: '−20%' },
    { title: 'Автокран 25 т', meta: 'Монтажные работы', market: 3500, ours: 2800, unit: 'ч', badge: '−20%' },
    { title: 'Мини-погрузчик Bobcat', meta: 'Узкий доступ', market: 1800, ours: 1450, unit: 'ч', badge: '−19%' },
    { title: 'Виброплита реверсивная', meta: 'Уплотнение грунта', market: 900, ours: 700, unit: 'сут', badge: '−22%' },
    { title: 'Автобетоносмеситель 6 м³', meta: 'Доставка бетона', market: 1200, ours: 1000, unit: 'ч', badge: '−17%' },
  ],
  labor: [
    { title: 'Бригада разнорабочих (3 чел.)', meta: 'Опыт на объектах от 2 лет', market: 350, ours: 280, unit: 'ч/чел', badge: '−20%' },
    { title: 'Грузчики (2 чел.)', meta: 'Переезды, склад, стройка', market: 400, ours: 320, unit: 'ч/чел', badge: '−20%' },
    { title: 'Строители-отделочники', meta: 'Плитка, штукатурка, покраска', market: 600, ours: 500, unit: 'ч/чел', badge: '−17%' },
    { title: 'Благоустройство (4 чел.)', meta: 'Озеленение, уборка, укладка', market: 300, ours: 240, unit: 'ч/чел', badge: '−20%' },
    { title: 'Бетонщики', meta: 'Опалубка, заливка, демонтаж', market: 550, ours: 440, unit: 'ч/чел', badge: '−20%' },
    { title: 'Сварщики NAKS', meta: 'Аттестованный персонал', market: 800, ours: 650, unit: 'ч/чел', badge: '−19%' },
  ],
  materials: [
    { title: 'Бетон М300 В22.5', meta: 'Прямая поставка с завода', market: 5200, ours: 4400, unit: 'м³', badge: '−15%' },
    { title: 'Щебень гранитный фр. 5-20', meta: 'С доставкой от 1 т', market: 1800, ours: 1500, unit: 'т', badge: '−17%' },
    { title: 'Песок мытый', meta: 'Карьерный, сертификат', market: 900, ours: 750, unit: 'т', badge: '−17%' },
    { title: 'Битум БНД 60/90', meta: 'Евроконтейнер, доставка', market: 32000, ours: 27000, unit: 'т', badge: '−16%' },
    { title: 'Арматура А500С Ø12', meta: 'С резкой в размер', market: 75000, ours: 64000, unit: 'т', badge: '−15%' },
    { title: 'Плитка тротуарная 200×100', meta: 'Собственное производство', market: 950, ours: 780, unit: 'м²', badge: '−18%' },
  ],
};

const TAB_CONFIG: Record<Tab, { label: string; icon: React.ReactNode; accent: string }> = {
  equipment: {
    label: 'Спецтехника',
    accent: '#F59E0B',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  labor: {
    label: 'Рабочая сила',
    accent: '#2F5BFF',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
  materials: {
    label: 'Стройматериалы',
    accent: '#10B981',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
    ),
  },
};

export default function OwnParkPage() {
  const [tab, setTab] = useState<Tab>('equipment');
  const items = OFFERS[tab];
  const cfg = TAB_CONFIG[tab];
  const totalSavings = items.reduce((s, i) => s + (i.market - i.ours), 0);
  const avgDiscount = Math.round(items.reduce((s, i) => s + (1 - i.ours / i.market), 0) / items.length * 100);

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-brand-900/95 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Подряд PRO — на главную">
            <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-xl opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-[16px] font-extrabold text-white font-heading tracking-tight">
              Подряд <span className="text-brand-400">PRO</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-white/60 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
              Собственный парк
            </span>
            <Link
              href="/#lead-form"
              className="btn-shine ml-3 bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all hover:shadow-glow cursor-pointer"
            >
              Оставить заявку
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-[#1a2550] to-[#2d1b69] text-white">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none select-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #2F5BFF 0%, transparent 60%), radial-gradient(circle at 80% 20%, #F59E0B 0%, transparent 50%)' }}
          aria-hidden="true"
        />
        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-500/20 border border-amber-400/40 text-sm mb-6">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-300">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span className="font-semibold text-amber-200">Выгодно от Подряд PRO</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4 font-heading">
              Собственный парк
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                −20% к рыночным ценам
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/75 mb-8 leading-relaxed max-w-xl">
              Подряд PRO — это не агрегатор. У нас собственная техника, свои бригады и прямые поставки материалов. Без посредников — вы получаете лучшую цену на рынке.
            </p>

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-lg">
              {[
                { v: '−20%', l: 'в среднем ниже рынка' },
                { v: '24/7', l: 'выезд в день заявки' },
                { v: '🛡', l: 'эскроу в каждой сделке' },
              ].map((s) => (
                <div key={s.l} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl px-3 py-4 text-center">
                  <div className="text-amber-300 text-xl sm:text-2xl font-extrabold font-heading">{s.v}</div>
                  <div className="text-white/55 text-[11px] mt-1 leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <section className="sticky top-16 z-30 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-3">
            {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => {
              const c = TAB_CONFIG[t];
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-dark-muted hover:bg-gray-200 dark:hover:bg-dark-border'
                  }`}
                  style={active ? { background: c.accent } : {}}
                  aria-pressed={active}
                >
                  <span className={active ? 'text-white' : ''} style={!active ? { color: c.accent } : {}}>
                    {c.icon}
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Offers grid ───────────────────────────────────── */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: cfg.accent }}>
                {cfg.label} &middot; от Подряд PRO
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1a1a2e] dark:text-white font-heading tracking-tight">
                Предложения с экономией до −{avgDiscount}%
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl px-4 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              <span className="text-xs text-gray-600 dark:text-dark-muted">Ваша экономия:</span>
              <span className="text-sm font-extrabold text-green-600 dark:text-green-400 font-heading">
                до {totalSavings.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <article
                key={item.title}
                className="group relative bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-300"
              >
                {item.badge && (
                  <div
                    className="absolute top-3 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow"
                    style={{ background: `linear-gradient(135deg, ${cfg.accent} 0%, #FF6B35 100%)` }}
                  >
                    {item.badge}
                  </div>
                )}

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${cfg.accent}15`, color: cfg.accent }}
                >
                  {cfg.icon}
                </div>

                <h3 className="font-bold text-[#1a1a2e] dark:text-white text-base mb-1 font-heading leading-tight pr-10">
                  {item.title}
                </h3>
                <p className="text-gray-500 dark:text-dark-muted text-xs mb-4">{item.meta}</p>

                <div className="flex items-end justify-between pt-3 border-t border-gray-100 dark:border-dark-border">
                  <div>
                    <div className="text-gray-400 text-xs line-through">
                      {item.market.toLocaleString('ru-RU')} ₽/{item.unit}
                    </div>
                    <div className="text-[#1a1a2e] dark:text-white font-extrabold text-lg font-heading">
                      {item.ours.toLocaleString('ru-RU')} ₽/{item.unit}
                    </div>
                  </div>
                  <Link
                    href="/#lead-form"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer hover:gap-1.5"
                    style={{ background: `${cfg.accent}15`, color: cfg.accent }}
                  >
                    Заявка
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why us ────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4 bg-white dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="eyebrow text-brand-500 mb-3 block">Почему Подряд PRO</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white font-heading tracking-tight">
              Выгода в каждом звене
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                ),
                color: '#F59E0B',
                title: 'Без посредников',
                desc: 'Техника, бригады и материалы — напрямую от Подряд PRO. Никаких перекупщиков и скрытых наценок.',
              },
              {
                icon: (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                ),
                color: '#6C5CE7',
                title: 'Гарантия качества',
                desc: 'ТО техники, аттестованные специалисты, сертифицированные материалы. Всё под контролем.',
              },
              {
                icon: (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                  </svg>
                ),
                color: '#2F5BFF',
                title: 'Эскроу-защита',
                desc: 'Деньги холдируются до подтверждения работы. Не подошло — вернём. Защита заказчика 100%.',
              },
            ].map((b) => (
              <div
                key={b.title}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-dark-card dark:to-dark-bg rounded-2xl p-6 border border-gray-100 dark:border-dark-border hover:shadow-card transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${b.color}15`, color: b.color }}
                >
                  {b.icon}
                </div>
                <h3 className="font-extrabold text-[#1a1a2e] dark:text-white text-base mb-2 font-heading">{b.title}</h3>
                <p className="text-gray-500 dark:text-dark-muted text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 bg-gradient-to-br from-brand-900 via-[#1a2550] to-[#2d1b69] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-4 font-heading tracking-tight">
            Получите предложение от Подряд PRO
          </h2>
          <p className="text-white/70 mb-8 text-base sm:text-lg">
            Расскажите о задаче — подберём технику, бригаду или материалы с максимальной выгодой.
            Перезвоним за&nbsp;15&nbsp;минут.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/#lead-form"
              className="btn-shine inline-flex items-center justify-center gap-2 bg-white text-brand-900 hover:text-brand-700 font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-glow-hover cursor-pointer"
            >
              Оставить заявку
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/order/new"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Разместить заказ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
