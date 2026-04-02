'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<City>('omsk');
  const [messenger, setMessenger] = useState<Messenger>('MAX');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  /* scroll-reveal refs */
  const revServices = useReveal();
  const revSteps = useReveal();
  const revForm = useReveal();

  /* count-up */
  const orders = useCountUp(500);
  const contractors = useCountUp(200);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setLoading(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          work_type: category,
          city,
          comment: description
            ? `${description} | Мессенджер: ${messenger}`
            : `Мессенджер: ${messenger}`,
          source: 'landing',
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-heading">
      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-extrabold text-[#2d35a8]">
            Подряд PRO
          </span>
          <a
            href="#lead-form"
            className="bg-[#f5a623] hover:bg-[#e09510] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Оставить заявку
          </a>
        </div>
      </nav>

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#1a1f5c] to-[#2d35a8] py-24 px-4 overflow-hidden noise-overlay hero-pattern">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6 animate-fade-in">
            Рабочие&nbsp;&middot; Техника&nbsp;&middot; Стройматериалы
            <br />
            <span className="text-[#f5a623]">
              — всё для стройки в&nbsp;Омске и&nbsp;Новосибирске
            </span>
          </h1>
          <p className="text-white/70 text-lg mb-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            Безопасная оплата через эскроу. Деньги переводятся исполнителю
            только после вашего подтверждения.
          </p>

          {/* ── Stats card (backdrop-blur) ──────────────────────── */}
          <div className="inline-flex gap-8 sm:gap-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-8 py-5 mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <span ref={orders.ref} className="block text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                {orders.value}+
              </span>
              <span className="text-white/60 text-sm">заказов</span>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <span ref={contractors.ref} className="block text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                {contractors.value}+
              </span>
              <span className="text-white/60 text-sm">исполнителей</span>
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
            <a
              href="#lead-form"
              className="inline-block bg-[#f5a623] hover:bg-[#e09510] text-white font-bold text-lg px-10 py-4 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(245,166,35,0.35)] cursor-pointer"
            >
              Оставить заявку
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. УСЛУГИ — 3 карточки ──────────────────────────────── */}
      <section className="py-20 px-4 bg-[#f8f9fc]">
        <div ref={revServices} className="max-w-6xl mx-auto reveal">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-12">
            Что мы предлагаем
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Рабочая сила */}
            <div className="bg-white rounded-[16px] p-8 shadow-card border border-gray-100 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-[#2d35a8]/10 flex items-center justify-center mb-5">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#2d35a8]"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Рабочая сила</h3>
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
                  <span>Уборка территории</span>
                  <span className="font-semibold text-gray-900">от 250 &#8381;/ч</span>
                </li>
                <li className="flex justify-between">
                  <span>Строители</span>
                  <span className="font-semibold text-gray-900">от 500 &#8381;/ч</span>
                </li>
              </ul>
              <p className="mt-4 text-[#2d35a8] font-semibold text-sm">
                Бригады от 2 до 15 человек
              </p>
            </div>

            {/* Аренда техники */}
            <div className="bg-white rounded-[16px] p-8 shadow-card border border-gray-100 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-[#f5a623]/10 flex items-center justify-center mb-5">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#f5a623]"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Аренда техники</h3>
              {equipment.length > 0 ? (
                <ul className="space-y-2 text-gray-600 text-sm">
                  {equipment.slice(0, 5).map((l) => (
                    <li key={l.listing_id} className="flex justify-between">
                      <span className="truncate mr-2">{l.title}</span>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">
                        {l.display_price.toLocaleString('ru-RU')} &#8381;/{l.price_unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">Загрузка каталога...</p>
              )}
              <p className="mt-4 text-[#f5a623] font-semibold text-sm">
                Любое количество, любой срок
              </p>
            </div>

            {/* Стройматериалы */}
            <div className="bg-white rounded-[16px] p-8 shadow-card border border-gray-100 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-5">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Стройматериалы</h3>
              {materials.length > 0 ? (
                <ul className="space-y-2 text-gray-600 text-sm">
                  {materials.slice(0, 5).map((l) => (
                    <li key={l.listing_id} className="flex justify-between">
                      <span className="truncate mr-2">{l.title}</span>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">
                        {l.display_price.toLocaleString('ru-RU')} &#8381;/{l.price_unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">Загрузка каталога...</p>
              )}
              <p className="mt-4 text-green-600 font-semibold text-sm">
                Доставка по городу
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. БЕЗОПАСНАЯ СДЕЛКА — 4 шага ───────────────────────── */}
      <section className="py-20 px-4 bg-[#0f1129]">
        <div ref={revSteps} className="max-w-5xl mx-auto reveal">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-14">
            Безопасная сделка
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { n: '1', title: 'Заявка', desc: 'Опишите задачу — объём, сроки, контакт' },
              { n: '2', title: 'Подбор', desc: 'Находим подходящего исполнителя из базы' },
              { n: '3', title: 'Оплата', desc: 'Деньги замораживаются на эскроу-счёте' },
              { n: '4', title: 'Подтверждение', desc: 'Выплата после вашего ОК — 100% защита' },
            ].map((step, i) => (
              <div key={step.n} className="text-center reveal" data-delay={String(i * 150)} style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e09510] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-4 shadow-[0_4px_20px_rgba(245,166,35,0.3)]">
                  {step.n}
                </div>
                <h3 className="font-bold text-white text-base mb-2">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. ФОРМА ЗАЯВКИ ─────────────────────────────────────── */}
      <section id="lead-form" className="py-20 px-4 bg-[#f8f9fc]">
        <div ref={revForm} className="max-w-lg mx-auto reveal">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">
            Оставить заявку
          </h2>
          <p className="text-gray-500 text-center mb-10">
            Свяжемся за 15 минут
          </p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center shadow-elevated">
              <p className="text-green-700 font-bold text-xl mb-1">Заявка отправлена!</p>
              <p className="text-green-600 text-sm">Свяжемся в течение 15 минут.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100 space-y-5"
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
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        category === wt
                          ? 'bg-[#2d35a8] text-white border-[#2d35a8] shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#2d35a8] hover:shadow-sm'
                      }`}
                    >
                      {CATEGORY_LABELS[wt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание задачи
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Что нужно сделать..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2d35a8] focus:ring-2 focus:ring-[#2d35a8]/20 resize-none transition-shadow"
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2d35a8] focus:ring-2 focus:ring-[#2d35a8]/20 transition-shadow"
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
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        city === c
                          ? 'bg-[#2d35a8] text-white border-[#2d35a8] shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#2d35a8] hover:shadow-sm'
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
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        messenger === m
                          ? 'bg-[#2d35a8] text-white border-[#2d35a8] shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#2d35a8] hover:shadow-sm'
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
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#2d35a8] focus:ring-[#2d35a8] cursor-pointer"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Я даю согласие на обработку персональных данных в соответствии
                  с&nbsp;
                  <a href="/privacy" className="text-[#2d35a8] underline">
                    Федеральным законом №152-ФЗ
                  </a>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !consent}
                className="bg-[#f5a623] hover:bg-[#e09510] text-white font-bold min-h-[56px] py-4 rounded-2xl w-full text-base transition-all hover:shadow-[0_8px_30px_rgba(245,166,35,0.35)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Отправляем...' : 'Отправить заявку'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-[#0f1129] py-8 px-4 text-center pb-24 md:pb-8">
        <p className="text-gray-500 text-sm">
          ИП Жбанков А.Д. &middot; ИНН 550516401202
        </p>
        <a
          href="/privacy"
          className="text-gray-600 hover:text-gray-400 text-sm underline mt-1 inline-block transition-colors"
        >
          Политика конфиденциальности
        </a>
      </footer>

      {/* ── STICKY CTA (mobile only) ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 safe-area-pb">
        <a
          href="#lead-form"
          className="block bg-[#f5a623] hover:bg-[#e09510] text-white font-bold text-base text-center py-3.5 rounded-xl transition-colors cursor-pointer shadow-elevated"
        >
          Оставить заявку
        </a>
      </div>
    </div>
  );
}
