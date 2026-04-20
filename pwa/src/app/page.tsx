'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ComboOfferBanner from '@/components/landing/ComboOfferBanner';
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput';
import Spinner from '@/components/ui/Spinner';

const LiveOrdersMap = dynamic(() => import('@/components/LiveOrdersMap'), { ssr: false });

type WorkType = 'labor' | 'equipment' | 'materials';
type City = 'omsk' | 'novosibirsk';
type Messenger = 'MAX' | 'Telegram' | 'Позвонить';

interface Listing {
  listing_id: string;
  title: string;
  display_price: number;
  price_unit: string;
}

const CATEGORY_LABELS: Record<WorkType, string> = {
  labor: 'Рабочие',
  equipment: 'Техника',
  materials: 'Материалы',
};

const CITY_LABELS: Record<City, string> = {
  omsk: 'Омск',
  novosibirsk: 'Новосибирск',
};

const FALLBACK_EQUIPMENT: Listing[] = [
  { listing_id: 'f-1', title: 'Экскаватор-погрузчик', display_price: 2500, price_unit: 'час' },
  { listing_id: 'f-2', title: 'Мини-погрузчик', display_price: 1800, price_unit: 'час' },
  { listing_id: 'f-3', title: 'Виброплита', display_price: 800, price_unit: 'сутки' },
  { listing_id: 'f-4', title: 'Бензопила / кусторез', display_price: 500, price_unit: 'сутки' },
  { listing_id: 'f-5', title: 'Газонокосилка', display_price: 400, price_unit: 'сутки' },
];

const FALLBACK_MATERIALS: Listing[] = [
  { listing_id: 'f-m1', title: 'Бетон М300 В22.5', display_price: 5200, price_unit: 'м³' },
  { listing_id: 'f-m2', title: 'Щебень фр. 5-20', display_price: 1800, price_unit: 'тонна' },
  { listing_id: 'f-m3', title: 'Песок мытый', display_price: 900, price_unit: 'тонна' },
  { listing_id: 'f-m4', title: 'Битум БНД 60/90', display_price: 32000, price_unit: 'тонна' },
];

/* ── helpers ─────────────────────────────────────────────────── */

function useFetchListings(type: string) {
  const [items, setItems] = useState<Listing[]>([]);
  useEffect(() => {
    fetch(`/api/listings/public?type=${type}`)
      .then((r) => r.json())
      .then((d) => setItems(d.listings ?? []))
      .catch(() => {});
  }, [type]);
  return items;
}

/* ── scroll-reveal hook ─────────────────────────────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── per-card stagger reveal (mobile-first scroll animation) ── */

function useStaggerReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const items = Array.from(container.children) as HTMLElement[];
    items.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)';
    });
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const i = items.indexOf(el);
            setTimeout(() => {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
              // Icon spring pop — fires after card fades in
              const iconEl = el.querySelector('[data-service-icon]') as HTMLElement | null;
              if (iconEl) {
                requestAnimationFrame(() => {
                  iconEl.style.animation = `svc-icon-spring 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 60 + 200}ms both`;
                });
              }
            }, i * 110);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' },
    );
    items.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── count-up hook ──────────────────────────────────────────── */

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  const animate = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          obs.unobserve(el);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [animate]);

  return { value, ref };
}

/* ── page ────────────────────────────────────────────────────── */

export default function HomePage() {
  const equipment = useFetchListings('equipment_rental');
  const materials = useFetchListings('material');

  /* form state */
  const [category, setCategory] = useState<WorkType>('labor');
  const [description, setDescription] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<City>('omsk');
  const [messenger, setMessenger] = useState<Messenger>('MAX');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState(false);

  /* scroll-reveal refs */
  const revServices = useReveal();
  const revServiceCards = useStaggerReveal();
  const revSteps = useReveal();
  const revExecutors = useReveal();
  const revForm = useReveal();

  /* count-up */
  const orders = useCountUp(500);
  const contractors = useCountUp(200);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!phone || !isValidPhone(phone)) newErrors.phone = 'Введите корректный номер телефона';
    if (!consent) newErrors.consent = 'Необходимо дать согласие';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitError(false);
    setLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          work_type: category,
          city,
          address: address || undefined,
          messenger,
          comment: [
            description,
            equipmentName ? `Техника: ${equipmentName}` : '',
            `Мессенджер: ${messenger}`,
            address ? `Адрес: ${address}` : '',
          ].filter(Boolean).join(' | '),
          source: 'landing',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg font-sans">
      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md border-b border-gray-100/80 dark:border-dark-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Подряд PRO"
                width={36}
                height={36}
                className="rounded-xl shadow-sm"
              />
            </div>
            <span className="text-[17px] font-extrabold text-brand-900 dark:text-white font-heading tracking-tight">
              Подряд <span className="text-brand-500">PRO</span>
            </span>
          </div>
          <a
            href="/order/new"
            className="btn-shine bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:shadow-glow cursor-pointer"
          >
            Разместить заказ
          </a>
        </div>
      </nav>

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section
        className="section-gradient relative py-16 sm:py-24 px-4 overflow-hidden"
      >
        {/* Grid overlay (must be on a child div, not on section — otherwise overwrites section-gradient) */}
        <div className="absolute inset-0 hero-grid opacity-60 pointer-events-none" />

        {/* Animated floating orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet/20 blur-[120px] pointer-events-none orb-1" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-500/25 blur-[100px] pointer-events-none orb-2" />
        <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full bg-white/5 blur-[80px] pointer-events-none orb-3" />
        {/* Extra depth orb */}
        <div className="absolute top-[10%] left-[40%] w-[300px] h-[300px] rounded-full bg-brand-500/10 blur-[90px] pointer-events-none" style={{ animation: 'orbit-slow 20s ease-in-out infinite' }} />

        {/* Noise texture */}
        <div className="absolute inset-0 noise-overlay pointer-events-none" />

        {/* Micro floating particles */}
        {([
          { s: 3, t: '12%', l: '8%',  d: '0s',   u: '9s'  },
          { s: 2, t: '38%', l: '18%', d: '2s',   u: '11s' },
          { s: 4, t: '65%', l: '11%', d: '1s',   u: '13s' },
          { s: 2, t: '20%', l: '88%', d: '3s',   u: '8s'  },
          { s: 3, t: '55%', l: '82%', d: '0.5s', u: '10s' },
          { s: 2, t: '78%', l: '92%', d: '2.5s', u: '12s' },
          { s: 4, t: '42%', l: '62%', d: '1.5s', u: '15s' },
          { s: 3, t: '85%', l: '38%', d: '4s',   u: '9s'  },
          { s: 2, t: '30%', l: '50%', d: '3.5s', u: '14s' },
          { s: 3, t: '72%', l: '28%', d: '1.2s', u: '11s' },
        ] as { s: number; t: string; l: string; d: string; u: string }[]).map((p, i) => (
          <div
            key={i}
            className="particle-dot"
            style={{ width: p.s, height: p.s, top: p.t, left: p.l, animationDelay: p.d, animationDuration: p.u }}
          />
        ))}

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Live badge */}
          <div className="live-badge mb-6 animate-fade-in inline-flex">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot flex-shrink-0" />
            Платформа для строительного бизнеса
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-[3.75rem] font-extrabold text-white leading-[1.08] mb-5 font-heading animate-fade-in tracking-tight">
            Персонал &middot; Техника &middot; Материалы
            <br />
            <span className="text-gradient">в&nbsp;Омске и&nbsp;Новосибирске</span>
          </h1>
          <p className="text-white/65 text-base sm:text-lg mb-8 max-w-xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.15s' }}>
            Стройка, благоустройство, частные участки.
            <br className="hidden sm:block" />
            Безопасная оплата &middot; Перезвоним за&nbsp;15&nbsp;минут
          </p>

          {/* Stats card */}
          <div
            className="inline-flex items-center gap-6 sm:gap-12 bg-white/[0.07] backdrop-blur-2xl border border-white/[0.11] rounded-2xl px-6 sm:px-10 py-4 sm:py-5 mb-8 animate-fade-in shadow-hero"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="text-center">
              <span ref={orders.ref} className="block text-3xl sm:text-4xl font-extrabold text-white tabular-nums font-heading leading-none">
                {orders.value}+
              </span>
              <span className="text-white/45 text-[11px] uppercase tracking-widest block mt-1.5 font-medium">заказов</span>
            </div>
            <div className="stats-divider" />
            <div className="text-center">
              <span ref={contractors.ref} className="block text-3xl sm:text-4xl font-extrabold text-white tabular-nums font-heading leading-none">
                {contractors.value}+
              </span>
              <span className="text-white/45 text-[11px] uppercase tracking-widest block mt-1.5 font-medium">исполнителей</span>
            </div>
          </div>

          <div className="animate-fade-in w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 px-2 sm:px-0" style={{ animationDelay: '0.45s' }}>
            <a
              href="/order/new"
              className="btn-shine group inline-flex items-center justify-center gap-2.5 bg-white text-brand-500 hover:text-brand-600 font-bold text-lg px-10 py-4 rounded-xl transition-all duration-300 hover:shadow-glow-hover btn-press cursor-pointer"
            >
              Разместить заказ
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1.5"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a
              href="#lead-form"
              className="inline-flex items-center justify-center gap-2 text-white font-semibold text-base px-10 py-4 rounded-xl transition-all duration-200 border-2 border-white/35 hover:border-white/65 hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              Оставить заявку
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="mt-10 flex flex-col items-center gap-1 pointer-events-none select-none">
            <span className="text-white/20 text-[10px] tracking-widest uppercase font-medium">Прокрутить</span>
            <div className="scroll-caret text-white/25 mt-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE MAP — активные заказы (сразу после Hero) ────── */}
      <section className="py-14 sm:py-18 px-4 bg-surface dark:bg-dark-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <span className="eyebrow text-brand-500 mb-4">Карта заказов</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white font-heading mb-3 tracking-tight">
              Заказы прямо сейчас
            </h2>
            <p className="text-gray-500 dark:text-dark-muted max-w-xl mx-auto text-sm sm:text-base">
              Активные заказы на карте в реальном времени. Нажмите на маркер, чтобы увидеть детали.
            </p>
          </div>
          <LiveOrdersMap />
          <p className="text-center text-gray-400 text-sm mt-4">
            <Link href="/dashboard" className="link-underline text-brand-500 hover:text-brand-600 font-medium transition-colors duration-200">
              Открыть полную карту →
            </Link>
          </p>
        </div>
      </section>

      {/* ── 2. УСЛУГИ ── 3 карточки + Наша техника + Выгодно ──── */}
      <section className="py-16 sm:py-20 px-4 bg-white dark:bg-dark-bg">
        {/* Keyframe for icon spring animation */}
        <style>{`
          @keyframes svc-icon-spring {
            0%   { transform: scale(0.35) rotate(-18deg); opacity: 0; }
            55%  { transform: scale(1.22) rotate(8deg);  opacity: 1; }
            75%  { transform: scale(0.93) rotate(-4deg); }
            100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
          }
          .svc-icon-glow {
            transition: box-shadow 0.35s ease, transform 0.35s ease;
          }
          .group:hover .svc-icon-glow,
          .group:active .svc-icon-glow {
            box-shadow: 0 0 0 6px rgba(47,91,255,0.12), 0 4px 16px rgba(47,91,255,0.2);
            transform: translateY(-2px) scale(1.06);
          }
        `}</style>

        <div ref={revServices} className="max-w-6xl mx-auto reveal">
          <div className="text-center mb-12">
            <span className="eyebrow text-brand-500 mb-4">Услуги</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white font-heading tracking-tight">
              Что мы предлагаем
            </h2>
          </div>

          {/* 3 service cards */}
          <div ref={revServiceCards} className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Рабочая сила */}
            <Link
              href="/catalog/labor"
              className="group bg-white dark:bg-dark-card rounded-2xl p-7 sm:p-8 shadow-card border border-gray-100 dark:border-dark-border card-lift cursor-pointer block active:scale-[0.98] transition-transform duration-150"
            >
              <div data-service-icon className="service-icon-wrap svc-icon-glow mb-6">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] dark:text-white mb-1 font-heading">Рабочая сила</h3>
              <p className="text-gray-400 dark:text-dark-muted text-xs mb-4 font-medium">Бригады от 2 до 15 человек</p>
              <ul className="space-y-2.5 text-sm mb-5">
                {[
                  { label: 'Грузчики', price: 'от 350 ₽/ч' },
                  { label: 'Разнорабочие', price: 'от 300 ₽/ч' },
                  { label: 'Благоустройство', price: 'от 250 ₽/ч' },
                  { label: 'Строители / ремонт', price: 'от 500 ₽/ч' },
                ].map((row) => (
                  <li key={row.label} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-dark-text">{row.label}</span>
                    <span className="price-label">{row.price}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-brand-500 font-semibold text-sm group-hover:gap-2.5 transition-all duration-300">
                <span>Смотреть каталог</span>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </Link>

            {/* Аренда техники */}
            <Link
              href="/catalog/equipment"
              className="group bg-white dark:bg-dark-card rounded-2xl p-7 sm:p-8 shadow-card border border-gray-100 dark:border-dark-border card-lift cursor-pointer block active:scale-[0.98] transition-transform duration-150"
            >
              <div data-service-icon className="service-icon-wrap svc-icon-glow mb-6">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] dark:text-white mb-1 font-heading">Аренда спецтехники</h3>
              <p className="text-gray-400 dark:text-dark-muted text-xs mb-4 font-medium">От тяжёлой до садовой</p>
              <ul className="space-y-2.5 text-sm mb-5">
                {(equipment.length > 0 ? equipment : FALLBACK_EQUIPMENT).slice(0, 4).map((l) => (
                  <li key={l.listing_id} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-dark-text truncate mr-2">{l.title}</span>
                    <span className="price-label whitespace-nowrap">
                      {l.display_price.toLocaleString('ru-RU')} ₽/{l.price_unit}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-brand-500 font-semibold text-sm group-hover:gap-2.5 transition-all duration-300">
                <span>Смотреть каталог</span>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </Link>

            {/* Стройматериалы */}
            <Link
              href="/catalog/materials"
              className="group bg-white dark:bg-dark-card rounded-2xl p-7 sm:p-8 shadow-card border border-gray-100 dark:border-dark-border card-lift cursor-pointer block active:scale-[0.98] transition-transform duration-150"
            >
              <div data-service-icon className="service-icon-wrap svc-icon-glow mb-6">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] dark:text-white mb-1 font-heading">Стройматериалы</h3>
              <p className="text-gray-400 dark:text-dark-muted text-xs mb-4 font-medium">Доставка по городу</p>
              <ul className="space-y-2.5 text-sm mb-5">
                {(materials.length > 0 ? materials : FALLBACK_MATERIALS).slice(0, 4).map((l) => (
                  <li key={l.listing_id} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-dark-text truncate mr-2">{l.title}</span>
                    <span className="price-label whitespace-nowrap">
                      {l.display_price.toLocaleString('ru-RU')} ₽/{l.price_unit}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-brand-500 font-semibold text-sm group-hover:gap-2.5 transition-all duration-300">
                <span>Смотреть каталог</span>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </Link>
          </div>

          {/* ── Наша техника — featured card (spans full width) ─── */}
          <Link
            href="/equipment"
            className="group mt-6 block rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <div className="relative bg-gradient-to-br from-brand-900 via-[#1a2550] to-[#2d1b69] p-6 sm:p-8 overflow-hidden">
              {/* BG glows */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-violet/20 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[250px] h-[200px] rounded-full bg-brand-500/20 blur-[60px] pointer-events-none" />
              <div className="absolute inset-0 hero-grid opacity-20 pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/80 text-xs font-semibold tracking-wide">Собственный парк техники</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 font-heading leading-tight">
                    Аренда техники{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">−20% от рынка</span>
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed max-w-md">
                    Наш автопарк без посредников. Экскаваторы, краны, самосвалы — с оператором или без.
                    Прямая скидка 20% гарантирована.
                  </p>
                </div>

                {/* Right — benefit chips + CTA */}
                <div className="flex-shrink-0 flex flex-col gap-3 sm:min-w-[220px]">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { e: '🏷', t: '−20% к рынку' },
                      { e: '👷', t: 'С оператором' },
                      { e: '⚡', t: 'Выезд от 4 ч' },
                      { e: '🛡', t: 'Эскроу-защита' },
                    ].map((b) => (
                      <div key={b.t} className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-xl px-3 py-2">
                        <span className="text-sm flex-shrink-0">{b.e}</span>
                        <span className="text-white/80 text-xs font-medium leading-tight">{b.t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-white group-hover:bg-brand-50 text-brand-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors duration-200">
                    Смотреть технику
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1.5">
                      <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 2.3. ВЫГОДНО ОТ ПОДРЯД PRO ─────────────────────────── */}
      <section className="py-14 sm:py-18 px-4 bg-surface dark:bg-dark-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="eyebrow text-brand-500 mb-4">Платформа</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white font-heading tracking-tight">
              Выгодно от Подряд PRO
            </h2>
            <p className="text-gray-500 dark:text-dark-muted mt-2 text-sm max-w-md mx-auto">
              Условия, которые работают на вас — каждый раз
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: '🔒', title: 'Эскроу-защита', desc: 'Деньги хранятся у нас до подтверждения работы' },
              { icon: '⚡', title: 'Ответ за 15 минут', desc: 'Перезвоним и подберём исполнителя сами' },
              { icon: '0 ₽', title: 'Без комиссий', desc: 'Платформа бесплатна для исполнителей' },
              { icon: '✓', title: 'Проверенная база', desc: '200+ исполнителей с оценками и отзывами' },
              { icon: '🗺', title: 'Карта заказов', desc: 'Видим все заказы в реальном времени' },
              { icon: '🏷', title: 'Скидка −20%', desc: 'На аренду собственной техники Подряд PRO' },
            ].map((b, i) => (
              <div
                key={b.title}
                className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card border border-gray-100 dark:border-dark-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="text-2xl mb-3 select-none">{b.icon}</div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1 font-heading">{b.title}</h4>
                <p className="text-xs text-gray-500 dark:text-dark-muted leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2.5. СОЗДАТЬ ЗАКАЗ — CTA ────────────────────────────── */}
      <section className="cta-bg py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="eyebrow text-brand-500 mb-4">Начать работу</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white font-heading mb-3 tracking-tight">
            Разместите заказ прямо сейчас
          </h2>
          <p className="text-gray-500 dark:text-dark-muted mb-8 max-w-lg mx-auto text-base">
            Укажите адрес и параметры работы — исполнители увидят ваш заказ и откликнутся
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link
              href="/order/new"
              className="btn-shine group inline-flex items-center justify-center gap-2 bg-brand-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-glow-hover hover:bg-brand-600 cursor-pointer btn-press min-w-[210px]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Заказать рабочих
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/order/new?type=equipment"
              className="group inline-flex items-center justify-center gap-2 bg-white dark:bg-dark-card text-brand-500 border-2 border-brand-200 dark:border-brand-800 hover:border-brand-500 font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer min-w-[210px]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
              </svg>
              Арендовать технику
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <Link href="/dashboard" className="link-underline text-brand-500 hover:text-brand-600 text-sm font-medium transition-colors duration-200">
            Смотреть все заказы на карте →
          </Link>
        </div>
      </section>

      {/* ── 3. БЕЗОПАСНАЯ СДЕЛКА — 4 шага ───────────────────────── */}
      <section className="section-gradient relative py-16 sm:py-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-brand-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-violet/10 blur-[100px] pointer-events-none" />
        <div ref={revSteps} className="relative z-10 max-w-5xl mx-auto reveal">
          <div className="text-center mb-14">
            <span className="eyebrow text-brand-400 mb-4">Как это работает</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
              Безопасная сделка
            </h2>
            <p className="text-white/50 text-sm mt-3 max-w-md mx-auto leading-relaxed">
              Деньги хранятся у нас до подтверждения работы — никакого риска
            </p>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px">
              <div className="w-full h-full bg-gradient-to-r from-brand-500/20 via-white/30 to-brand-500/20" />
            </div>
            {[
              {
                n: '1',
                title: 'Заявка',
                desc: 'Опишите задачу — объём, сроки, контакт',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                ),
              },
              {
                n: '2',
                title: 'Подбор',
                desc: 'Находим подходящего исполнителя из базы',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                ),
              },
              {
                n: '3',
                title: 'Оплата',
                desc: 'Деньги холдируются — исполнитель приступает',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                  </svg>
                ),
              },
              {
                n: '4',
                title: 'Подтверждение',
                desc: 'Приняли работу — переводим оплату исполнителю',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div key={step.n} className="relative text-center group" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div
                  className="relative w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-violet flex items-center justify-center text-white mx-auto mb-5 shadow-glow-hover ring-4 ring-white/10 transition-all duration-500 group-hover:ring-white/25 group-hover:shadow-glow-lg"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  <span className="step-ring" style={{ animationDelay: `${i * 0.8}s` }} />
                  <span className="step-ring step-ring-reverse" style={{ animationDelay: `${i * 0.4}s` }} />
                  <span className="relative z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                    {step.icon}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mb-2 font-heading">{step.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed group-hover:text-white/65 transition-colors duration-300">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3.5. КОМБО-СКИДКА ─────────────────────────────────── */}
      <ComboOfferBanner />

      {/* ── (own-equipment promo moved into services section) ── */}
      <section className="hidden">
        {/* Background effects */}
        <div className="absolute inset-0 hero-grid opacity-40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-violet/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 noise-overlay pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot flex-shrink-0" />
                <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Собственный парк техники</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-5 font-heading tracking-tight">
                Аренда техники
                <br />
                <span className="text-gradient">на 20% дешевле</span>
                <br />
                рынка
              </h2>

              <p className="text-white/60 text-base sm:text-lg mb-8 leading-relaxed max-w-md">
                Подряд PRO владеет собственным парком спецтехники. Без посредников — вы
                получаете прямую скидку&nbsp;20% и гарантию надёжности.
              </p>

              {/* Key benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  { icon: '🏷', title: '−20% к рынку', desc: 'Без наценки посредников' },
                  { icon: '👷', title: 'Опытный оператор', desc: 'В комплекте по запросу' },
                  { icon: '⚡', title: 'Выезд от 4 часов', desc: 'Минимальная аренда' },
                  { icon: '🛡', title: 'Гарантия сделки', desc: 'Эскроу-защита оплаты' },
                ].map((b) => (
                  <div key={b.title} className="flex items-start gap-3 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 hover:bg-white/[0.09] transition-colors duration-200">
                    <span className="text-xl flex-shrink-0 mt-0.5">{b.icon}</span>
                    <div>
                      <div className="text-white font-semibold text-sm">{b.title}</div>
                      <div className="text-white/45 text-xs mt-0.5">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/equipment"
                  className="btn-shine group inline-flex items-center justify-center gap-2.5 bg-white text-brand-900 hover:text-brand-700 font-bold text-base px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-glow-hover btn-press cursor-pointer"
                >
                  Смотреть технику
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1.5"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
                <a
                  href="#lead-form"
                  className="inline-flex items-center justify-center gap-2 text-white/60 hover:text-white/90 font-semibold text-sm px-6 py-4 rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer"
                >
                  Оставить заявку
                </a>
              </div>
            </div>

            {/* Right — savings calculator */}
            <div className="lg:pl-6">
              <div className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-2xl p-6 sm:p-8 shadow-hero">
                <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-5">
                  Пример экономии
                </div>

                {/* Calculator row */}
                {[
                  { name: 'Экскаватор 20 т', days: '5 дней', market: 25000, ours: 20000 },
                  { name: 'Самосвал 15 т', days: '3 дня', market: 18000, ours: 14400 },
                  { name: 'Автокран 25 т', days: '1 день', market: 35000, ours: 28000 },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between py-3.5 border-b border-white/[0.07] last:border-0">
                    <div>
                      <div className="text-white font-semibold text-sm">{row.name}</div>
                      <div className="text-white/35 text-xs mt-0.5">{row.days}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-white/30 text-xs line-through">
                          {row.market.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          −20%
                        </span>
                      </div>
                      <div className="text-white font-bold text-base mt-0.5">
                        {row.ours.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total savings highlight */}
                <div className="mt-5 bg-gradient-to-r from-brand-500/20 to-violet/20 border border-brand-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white/60 text-xs mb-0.5">Ваша экономия на 3 позициях</div>
                    <div className="text-white font-extrabold text-xl font-heading">
                      {(
                        (25000 - 20000) + (18000 - 14400) + (35000 - 28000)
                      ).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-brand-500/30 flex items-center justify-center flex-shrink-0">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-400" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                  </div>
                </div>

                <Link
                  href="/equipment"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all duration-200 hover:shadow-glow cursor-pointer"
                >
                  Посмотреть весь парк →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. ДЛЯ ИСПОЛНИТЕЛЕЙ ────────────────────────────────── */}
      <section className="section-gradient relative py-16 sm:py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
        <div ref={revExecutors} className="relative z-10 max-w-3xl mx-auto text-center reveal">
          <span className="eyebrow text-white/60 mb-4">Партнёрам</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 font-heading tracking-tight">
            Для исполнителей
          </h2>
          <p className="text-white/70 text-base sm:text-lg mb-8 leading-relaxed max-w-xl mx-auto">
            Платформа полностью бесплатна. Получайте заказы, выставляйте услуги&nbsp;— без комиссий и подписок.
          </p>

          {/* Benefit pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {[
              { icon: '0 ₽', label: 'Без комиссий' },
              { icon: '✓', label: 'Прямые заказы' },
              { icon: '🔒', label: 'Безопасные выплаты' },
              { icon: '🗺', label: 'Карта заказов' },
              { icon: '⚡', label: 'Быстрый отклик' },
            ].map((b) => (
              <div key={b.label} className="benefit-pill">
                <span className="text-green-400 text-xs font-bold">{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/join"
              className="btn-shine group inline-flex items-center justify-center gap-2 bg-white text-brand-500 hover:text-brand-600 font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-glow-hover btn-press cursor-pointer"
            >
              Заполнить анкету
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/18 font-semibold px-8 py-4 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Регистрация исполнителя
            </a>
          </div>
        </div>
      </section>

      {/* ── 5. ФОРМА ЗАЯВКИ ─────────────────────────────────────── */}
      <section id="lead-form" className="py-16 sm:py-20 px-4 bg-surface dark:bg-dark-bg">
        <div ref={revForm} className="max-w-lg mx-auto reveal">
          <div className="text-center mb-10">
            <span className="eyebrow text-brand-500 mb-4">Связаться</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white font-heading mb-3 tracking-tight">
              Оставить заявку
            </h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm">
              Свяжемся за&nbsp;15&nbsp;минут
            </p>
          </div>

          {submitted ? (
            <div className="bg-success-50 border border-green-200 rounded-2xl p-10 text-center shadow-elevated animate-scale-in relative overflow-hidden">
              {/* Confetti */}
              <div className="confetti-container">
                <div className="confetti-dot" />
                <div className="confetti-dot" />
                <div className="confetti-dot" />
                <div className="confetti-dot" />
                <div className="confetti-dot" />
                <div className="confetti-dot" />
              </div>
              {/* Success icon */}
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600">
                  <path className="success-check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-700 font-bold text-xl mb-1 font-heading">Заявка отправлена!</p>
              <p className="text-green-600 text-sm">Свяжемся в течение 15 минут.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 sm:p-8 shadow-elevated border border-gray-100/80 dark:border-dark-border space-y-6"
            >
              {/* Категория */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Категория
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['labor', 'equipment', 'materials'] as WorkType[]).map((wt) => (
                    <button
                      key={wt}
                      type="button"
                      onClick={() => setCategory(wt)}
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        category === wt
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:border-brand-500 hover:shadow-sm'
                      }`}
                    >
                      {CATEGORY_LABELS[wt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Наименование техники (только для категории Техника) */}
              {category === 'equipment' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Какая техника нужна?
                  </label>
                  <input
                    type="text"
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    placeholder="Экскаватор, бульдозер, автокран..."
                    className="w-full border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 dark:text-white dark:bg-dark-bg placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                  />
                </div>
              )}

              {/* Описание */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Описание задачи
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={category === 'equipment' ? 'На какой срок, с оператором или без...' : 'Что нужно сделать...'}
                  className="w-full border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 dark:text-white dark:bg-dark-bg placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow"
                />
              </div>

              {/* Адрес */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Адрес объекта
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ул. Ленина, 1 (необязательно)"
                  className="w-full border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 dark:text-white dark:bg-dark-bg placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Телефон <span className="text-red-400">*</span>
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(v) => { setPhone(v); if (errors.phone) setErrors((prev) => { const { phone: _, ...rest } = prev; return rest; }); }}
                  onBlur={() => { if (phone && !isValidPhone(phone)) setErrors((prev) => ({ ...prev, phone: 'Введите корректный номер телефона' })); }}
                  required
                  error={errors.phone}
                />
              </div>

              {/* Город */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Город
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['omsk', 'novosibirsk'] as City[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        city === c
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:border-brand-500 hover:shadow-sm'
                      }`}
                    >
                      {CITY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Мессенджер */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Как связаться
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MAX', 'Telegram', 'Позвонить'] as Messenger[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMessenger(m)}
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        messenger === m
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:border-brand-500 hover:shadow-sm'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Согласие 152-ФЗ */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-xs text-gray-500 dark:text-dark-muted leading-relaxed">
                  Я даю согласие на обработку персональных данных в соответствии
                  с&nbsp;
                  <a href="/privacy" className="text-brand-500 underline">
                    Федеральным законом №152-ФЗ
                  </a>
                </span>
              </label>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !consent}
                className="btn-shine bg-brand-500 hover:bg-brand-600 text-white font-bold min-h-[56px] py-4 rounded-xl w-full text-base transition-all hover:shadow-glow-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 btn-press"
              >
                {loading ? <><Spinner className="w-5 h-5 text-white" /> Отправляем...</> : 'Отправить заявку'}
              </button>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <span className="trust-badge">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Данные защищены
                </span>
                <span className="trust-badge">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Ответ за 15 минут
                </span>
                <span className="trust-badge">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Эскроу-защита
                </span>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="footer-bg py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500/25 flex items-center justify-center ring-1 ring-white/15">
                  <Image src="/logo.png" alt="Подряд PRO" width={20} height={20} className="rounded opacity-90" />
                </div>
                <span className="text-white/90 text-sm font-heading font-bold tracking-tight">Подряд PRO</span>
              </div>
              <p className="text-white/55 text-xs leading-relaxed max-w-[200px]">
                Платформа строительных услуг Омска и Новосибирска
              </p>
              <div className="flex items-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-white/55 text-xs">Сервис активен</span>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-white/55 text-xs mb-1.5">ИП Жбанков А.Д.</p>
              <p className="text-white/55 text-xs">ИНН 550516401202</p>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-lg px-3 py-1.5">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <span className="text-white/65 text-[11px] font-medium">Эскроу-защита сделок</span>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/privacy"
                className="link-underline text-white/65 hover:text-white/90 text-sm transition-colors duration-200 w-fit"
              >
                Политика конфиденциальности
              </Link>
              <Link
                href="/dashboard"
                className="link-underline text-white/65 hover:text-white/90 text-sm transition-colors duration-200 w-fit"
              >
                Карта заказов
              </Link>
              <Link
                href="/admin"
                className="text-white/35 hover:text-white/60 text-xs transition-colors duration-200 w-fit mt-1"
              >
                Управление
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/50 text-xs">
              © {new Date().getFullYear()} Подряд PRO
            </p>
            <p className="text-white/50 text-xs text-center sm:text-right">
              Безопасные сделки для строительного бизнеса
            </p>
          </div>
        </div>
      </footer>


    </div>
  );
}
