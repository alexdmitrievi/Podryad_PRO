'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput';
import Spinner from '@/components/ui/Spinner';

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
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Подряд PRO"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-lg font-extrabold text-brand-900 font-heading">
              Подряд PRO
            </span>
          </div>
          <a
            href="/order/new"
            className="bg-brand-500 hover:bg-[#4DA3FF] text-white font-bold text-sm px-5 py-2.5 rounded-[10px] transition-colors cursor-pointer"
          >
            Разместить заказ
          </a>
        </div>
      </nav>

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section
        className="relative py-28 sm:py-32 px-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E2A5A 0%, #2F5BFF 60%, #6C5CE7 100%)' }}
      >
        {/* Decorative floating orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#6C5CE7]/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#2F5BFF]/25 blur-[100px] pointer-events-none" />
        <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full bg-white/5 blur-[80px] pointer-events-none animate-float" />

        {/* Noise texture */}
        <div className="absolute inset-0 noise-overlay pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 badge-brand-hero mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
            Платформа для строительного бизнеса
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-8 font-heading animate-fade-in tracking-tight">
            Персонал &middot; Техника &middot; Материалы
            <br />
            <span className="text-gradient">в&nbsp;Омске и&nbsp;Новосибирске</span>
          </h1>
          <p className="text-white/70 text-lg sm:text-xl mb-12 max-w-xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.15s' }}>
            Стройка, благоустройство, частные участки.
            <br />
            Эскроу-оплата &middot; Перезвоним за 15 минут
          </p>

          {/* Stats card */}
          <div className="inline-flex gap-8 sm:gap-14 bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] rounded-2xl px-10 py-6 mb-12 animate-fade-in shadow-hero" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <span ref={orders.ref} className="block text-4xl sm:text-5xl font-extrabold text-white tabular-nums font-heading">
                {orders.value}+
              </span>
              <span className="text-white/50 text-sm mt-1 block">заказов выполнено</span>
            </div>
            <div className="w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="text-center">
              <span ref={contractors.ref} className="block text-4xl sm:text-5xl font-extrabold text-white tabular-nums font-heading">
                {contractors.value}+
              </span>
              <span className="text-white/50 text-sm mt-1 block">исполнителей в базе</span>
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
            <a
              href="/order/new"
              className="group inline-flex items-center gap-2 bg-white text-brand-500 hover:text-brand-600 font-bold text-lg px-10 py-4 rounded-[10px] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(47,91,255,0.3)] cursor-pointer"
            >
              Разместить заказ
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. УСЛУГИ — 3 карточки ──────────────────────────────── */}
      <section className="py-24 px-4 bg-surface">
        <div ref={revServices} className="max-w-6xl mx-auto reveal">
          <div className="text-center mb-14">
            <span className="inline-block text-brand-500 font-semibold text-sm tracking-wider uppercase mb-3">Услуги</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#2B2B2B] font-heading">
              Что мы предлагаем
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Рабочая сила */}
            <Link href="/catalog/labor" className="group bg-white rounded-2xl p-8 shadow-card border border-gray-100 transition-all duration-500 hover:shadow-card-hover hover:-translate-y-2 cursor-pointer block">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6 transition-colors duration-300 group-hover:bg-brand-500 group-hover:shadow-glow">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-500 transition-colors duration-300 group-hover:text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#2B2B2B] mb-4 font-heading">Рабочая сила</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex justify-between">
                  <span>Грузчики</span>
                  <span className="font-semibold text-gray-900">от 350 &#8381;/ч</span>
                </li>
                <li className="flex justify-between">
                  <span>Разнорабочие</span>
                  <span className="font-semibold text-gray-900">от 300 &#8381;/ч</span>
                </li>
                <li className="flex justify-between">
                  <span>Благоустройство участков</span>
                  <span className="font-semibold text-gray-900">от 250 &#8381;/ч</span>
                </li>
                <li className="flex justify-between">
                  <span>Строители / ремонт</span>
                  <span className="font-semibold text-gray-900">от 500 &#8381;/ч</span>
                </li>
              </ul>
              <p className="mt-4 text-brand-500 font-semibold text-sm flex items-center gap-1">
                Бригады от 2 до 15 человек &middot; Частные участки
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="ml-auto flex-shrink-0"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </p>
            </Link>

            {/* Аренда техники */}
            <Link href="/catalog/equipment" className="group bg-white rounded-2xl p-8 shadow-card border border-gray-100 transition-all duration-500 hover:shadow-card-hover hover:-translate-y-2 cursor-pointer block">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6 transition-colors duration-300 group-hover:bg-brand-500 group-hover:shadow-glow">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-500 transition-colors duration-300 group-hover:text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#2B2B2B] mb-4 font-heading">Аренда техники</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                {(equipment.length > 0 ? equipment : FALLBACK_EQUIPMENT).slice(0, 5).map((l) => (
                  <li key={l.listing_id} className="flex justify-between">
                    <span className="truncate mr-2">{l.title}</span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      {l.display_price.toLocaleString('ru-RU')} &#8381;/{l.price_unit}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-brand-500 font-semibold text-sm flex items-center gap-1">
                От тяжёлой до садовой техники
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="ml-auto flex-shrink-0"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </p>
            </Link>

            {/* Стройматериалы */}
            <Link href="/catalog/materials" className="group bg-white rounded-2xl p-8 shadow-card border border-gray-100 transition-all duration-500 hover:shadow-card-hover hover:-translate-y-2 cursor-pointer block">
              <div className="w-14 h-14 rounded-2xl bg-violet/10 flex items-center justify-center mb-6 transition-colors duration-300 group-hover:bg-violet group-hover:shadow-[0_0_30px_rgba(108,92,231,0.2)]">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet transition-colors duration-300 group-hover:text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#2B2B2B] mb-4 font-heading">Стройматериалы</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                {(materials.length > 0 ? materials : FALLBACK_MATERIALS).slice(0, 5).map((l) => (
                  <li key={l.listing_id} className="flex justify-between">
                    <span className="truncate mr-2">{l.title}</span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      {l.display_price.toLocaleString('ru-RU')} &#8381;/{l.price_unit}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-violet font-semibold text-sm flex items-center gap-1">
                Доставка по городу
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="ml-auto flex-shrink-0"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2.5. СОЗДАТЬ ЗАКАЗ — CTA ────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#2B2B2B] font-heading mb-4">
            Разместите заказ прямо сейчас
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Укажите адрес на карте, параметры работы — исполнители увидят ваш заказ и откликнутся
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/orders/new"
              className="group inline-flex items-center justify-center gap-2 bg-brand-500 text-white font-bold px-8 py-4 rounded-[10px] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(47,91,255,0.35)] cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              Заказать рабочих
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link
              href="/orders/new-rental"
              className="group inline-flex items-center justify-center gap-2 bg-amber-500 text-white font-bold px-8 py-4 rounded-[10px] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(245,158,11,0.35)] cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
              Арендовать технику
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            <Link href="/dashboard" className="text-brand-500 hover:underline">Смотреть все заказы на карте</Link>
          </p>
        </div>
      </section>

      {/* ── 3. БЕЗОПАСНАЯ СДЕЛКА — 4 шага ───────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: 'linear-gradient(160deg, #1E2A5A 0%, #162050 100%)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
        <div ref={revSteps} className="relative z-10 max-w-5xl mx-auto reveal">
          <div className="text-center mb-16">
            <span className="inline-block text-brand-400 font-semibold text-sm tracking-wider uppercase mb-3">Как это работает</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-heading">
              Безопасная сделка
            </h2>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-brand-500/40 via-violet/40 to-brand-500/40" />
            {[
              { n: '1', title: 'Заявка', desc: 'Опишите задачу — объём, сроки, контакт' },
              { n: '2', title: 'Подбор', desc: 'Находим подходящего исполнителя из базы' },
              { n: '3', title: 'Оплата', desc: 'Деньги замораживаются на эскроу-счёте' },
              { n: '4', title: 'Подтверждение', desc: 'Выплата после вашего ОК — 100% защита' },
            ].map((step, i) => (
              <div key={step.n} className="relative text-center" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-violet flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-5 shadow-[0_4px_24px_rgba(47,91,255,0.35)] ring-4 ring-brand-900">
                  {step.n}
                </div>
                <h3 className="font-bold text-white text-base mb-2 font-heading">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. ДЛЯ ИСПОЛНИТЕЛЕЙ ────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #2F5BFF 0%, #6C5CE7 100%)' }}>
        <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-white/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[300px] h-[300px] rounded-full bg-[#1E2A5A]/30 blur-[80px] pointer-events-none" />
        <div ref={revExecutors} className="relative z-10 max-w-3xl mx-auto text-center reveal">
          <span className="inline-block text-white/70 font-semibold text-sm tracking-wider uppercase mb-3">Партнёрам</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 font-heading">
            Для исполнителей
          </h2>
          <p className="text-white/80 text-lg mb-12 leading-relaxed max-w-xl mx-auto">
            Платформа бесплатна для исполнителей. Получайте заказы, выставляйте свои услуги — без комиссий и подписок.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/join"
              className="group inline-flex items-center justify-center gap-2 bg-white text-brand-500 hover:text-brand-600 font-bold px-8 py-4 rounded-[10px] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(255,255,255,0.2)] cursor-pointer"
            >
              Заполнить анкету
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a
              href="/join"
              className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white hover:bg-white/25 font-bold px-8 py-4 rounded-[10px] transition-all duration-300 cursor-pointer"
            >
              Стать исполнителем
            </a>
          </div>
        </div>
      </section>

      {/* ── 5. ФОРМА ЗАЯВКИ ─────────────────────────────────────── */}
      <section id="lead-form" className="py-24 px-4 bg-surface">
        <div ref={revForm} className="max-w-lg mx-auto reveal">
          <div className="text-center mb-10">
            <span className="inline-block text-brand-500 font-semibold text-sm tracking-wider uppercase mb-3">Связаться</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#2B2B2B] font-heading mb-3">
              Оставить заявку
            </h2>
            <p className="text-gray-500">
              Свяжемся за 15 минут
            </p>
          </div>

          {submitted ? (
            <div className="bg-success-50 border border-green-200 rounded-xl p-10 text-center shadow-elevated">
              <p className="text-green-700 font-bold text-xl mb-1">Заявка отправлена!</p>
              <p className="text-green-600 text-sm">Свяжемся в течение 15 минут.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-8 sm:p-10 shadow-elevated border border-gray-100/80 space-y-6"
            >
              {/* Категория */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Категория
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['labor', 'equipment', 'materials'] as WorkType[]).map((wt) => (
                    <button
                      key={wt}
                      type="button"
                      onClick={() => setCategory(wt)}
                      className={`min-h-[48px] py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        category === wt
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500 hover:shadow-sm'
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Какая техника нужна?
                  </label>
                  <input
                    type="text"
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    placeholder="Экскаватор, бульдозер, автокран..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                  />
                </div>
              )}

              {/* Описание */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание задачи
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={category === 'equipment' ? 'На какой срок, с оператором или без...' : 'Что нужно сделать...'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow"
                />
              </div>

              {/* Адрес */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Адрес объекта
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ул. Ленина, 1 (необязательно)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон <span className="text-red-400">*</span>
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                  error={errors.phone}
                />
              </div>

              {/* Город */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Город
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['omsk', 'novosibirsk'] as City[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`min-h-[48px] py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        city === c
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500 hover:shadow-sm'
                      }`}
                    >
                      {CITY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Мессенджер */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Как связаться
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MAX', 'Telegram', 'Позвонить'] as Messenger[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMessenger(m)}
                      className={`min-h-[48px] py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        messenger === m
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500 hover:shadow-sm'
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
                <span className="text-xs text-gray-500 leading-relaxed">
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
                className="bg-brand-500 hover:bg-[#4DA3FF] text-white font-bold min-h-[56px] py-4 rounded-[10px] w-full text-base transition-all hover:shadow-[0_8px_30px_rgba(47,91,255,0.35)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner className="w-5 h-5 text-white" /> Отправляем...</> : 'Отправить заявку'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-10 px-4" style={{ background: 'linear-gradient(160deg, #1E2A5A 0%, #162050 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="divider-gradient mb-8" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Подряд PRO" width={24} height={24} className="rounded opacity-60" />
              <span className="text-white/40 text-sm font-heading font-semibold">Подряд PRO</span>
            </div>
            <p className="text-white/30 text-sm">
              ИП Жбанков А.Д. &middot; ИНН 550516401202
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/privacy"
                className="text-white/40 hover:text-white/70 text-sm underline transition-colors duration-200"
              >
                Политика конфиденциальности
              </Link>
              <Link
                href="/admin?tab=contacts"
                className="text-white/50 hover:text-white/80 text-sm underline transition-colors duration-200"
              >
                Админ-панель
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA (mobile only) ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 safe-area-pb">
        <a
          href="/order/new"
          className="block bg-brand-500 hover:bg-[#4DA3FF] text-white font-bold text-base text-center py-3.5 rounded-[10px] transition-colors cursor-pointer shadow-elevated"
        >
          Разместить заказ
        </a>
      </div>
    </div>
  );
}
