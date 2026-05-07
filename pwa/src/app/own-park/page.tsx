'use client';

import Link from 'next/link';
import Image from 'next/image';

const SERVICES = [
  { title: 'Покос, аэрация и скарификация газона', desc: 'Профессиональный уход за газоном любой площади. Выезд, оценка, работа в день обращения.' },
  { title: 'Расчистка территорий под строительство', desc: 'Полная подготовка участка: вывоз мусора, планировка, корчевание. Техника и бригада в одном заказе.' },
  { title: 'Корчевание пней и спил деревьев', desc: 'Удаление деревьев любой сложности. Спил, корчевание, вывоз порубочных остатков.' },
  { title: 'Покос высокой травы и сорняка любого вида', desc: 'Бензокосы, райдеры, тракторные косилки. Любой рельеф и густота.' },
  { title: 'Сборка и чистка бассейнов', desc: 'Расконсервация, сборка каркасных и надувных бассейнов, химчистка, подготовка к сезону.' },
  { title: 'Любые сварочные работы', desc: 'Аттестованные сварщики NAKS. Монтаж металлоконструкций, ворота, заборы, навесы.' },
  { title: 'Ремонтные работы жилой и коммерческой недвижимости', desc: 'Косметический и капитальный ремонт. Квартиры, офисы, торговые площади — под ключ.' },
  { title: 'Строительство домов под ключ', desc: 'От фундамента до чистовой отделки. Проектирование, материалы, бригады — полный цикл.' },
  { title: 'Абонентское обслуживание участков и территорий под ключ', desc: 'Постоянный уход за территорией. Покос, уборка, мелкий ремонт, вывоз мусора — по графику.' },
];

export default function OwnParkPage() {
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
              Собственный парк услуг
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
              Собственный парк услуг
            </h1>
            <p className="text-base sm:text-lg text-white/75 mb-8 leading-relaxed max-w-xl">
              Гарантия на все услуги. Договор и закрывающие документы для бизнеса. Качество премиум-подрядчика — по рыночной цене.
            </p>

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-lg">
              {[
                { v: '🛡', l: 'гарантия на все услуги' },
                { v: '📄', l: 'договор и закрывающие документы' },
                { v: '⚡', l: 'выезд в день заявки' },
              ].map((s) => (
                <div key={s.l} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl px-3 py-4 text-center">
                  <div className="text-2xl sm:text-3xl">{s.v}</div>
                  <div className="text-white/55 text-[11px] mt-1.5 leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services grid ──────────────────────────────────── */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1 text-brand-500">
              Услуги &middot; от Подряд PRO
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1a1a2e] dark:text-white font-heading tracking-tight">
              Все цены — по запросу
            </h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm mt-1">
              Стоимость зависит от объёма, адреса и сроков. Свяжитесь с нами — рассчитаем за 15 минут.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((item) => (
              <article
                key={item.title}
                className="group relative bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-brand-500/10 text-brand-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>

                <h3 className="font-bold text-[#1a1a2e] dark:text-white text-base mb-2 font-heading leading-tight pr-8">
                  {item.title}
                </h3>
                <p className="text-gray-500 dark:text-dark-muted text-xs mb-4 leading-relaxed">{item.desc}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-border">
                  <span className="text-xs font-semibold text-brand-500 dark:text-brand-400">
                    Цена по запросу
                  </span>
                  <Link
                    href="/#lead-form"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-all duration-200 cursor-pointer hover:gap-1.5"
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
              Качество, подтверждённое договором
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                ),
                color: '#6C5CE7',
                title: 'Гарантия на все услуги',
                desc: 'Фиксируем обязательства в договоре. Если результат не устроит — переделаем за свой счёт.',
              },
              {
                icon: (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                ),
                color: '#2F5BFF',
                title: 'Закрывающие документы',
                desc: 'Акты, счета, договоры — полный пакет первичной документации для вашего бизнеса.',
              },
              {
                icon: (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                  </svg>
                ),
                color: '#F59E0B',
                title: 'Рыночные цены',
                desc: 'Без посредников и скрытых наценок. Цена как у прямого подрядчика — потому что мы им и являемся.',
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
            Расскажите о задаче — подберём услуги с максимальной выгодой.
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
