import Link from 'next/link';
import { ArrowRight, Users, Wrench, Shield, Clock, Star, ChevronRight, Truck, HardHat, Sparkles, Leaf, Hammer, Zap, Building2, Gift, ChevronDown } from 'lucide-react';
import CostCalculator from '@/components/CostCalculator';
import AnimatedCounter from '@/components/AnimatedCounter';
import Testimonials from '@/components/Testimonials';
import ScrollReveal from '@/components/ScrollReveal';
import MaterialsSection from '@/components/MaterialsSection';

const tgBot = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel =
  process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';
const telegramUrl = `https://t.me/${tgBot}`;

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">

      {/* ─── Section 1: HERO ─── */}
      <section className="relative bg-gradient-to-br from-[#0a0c14] via-brand-900 to-brand-700 text-white overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="noise-overlay relative">
          <div className="relative z-10 max-w-2xl mx-auto px-5 pt-28 pb-24 md:pt-44 md:pb-36 text-center">
            <span className="badge-brand-hero inline-flex items-center gap-2 mb-6 md:mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse-dot_1.5s_ease-in-out_infinite] shrink-0" aria-hidden="true" />
              Принимаем заказы · Омск и Новосибирск
            </span>

            <h1 className="text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gradient tracking-tight leading-[1.12] sm:leading-[1.08]">
              Одна заявка —
              <br />
              вся команда на объекте
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/50 mt-5 md:mt-7 max-w-sm sm:max-w-md mx-auto leading-relaxed">
              Рабочие, техника, материалы, инструмент.
              <br className="sm:hidden" />
              {' '}Омск и Новосибирск
            </p>

            <div className="mt-8 md:mt-11 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
              <Link
                href="/app/order"
                className="inline-flex items-center justify-center gap-2 btn-animated-gradient text-brand-700 font-bold py-4 px-8 md:py-5 md:px-10 rounded-2xl text-base md:text-lg shadow-hero hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
              >
                Оформить заказ
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/equipment"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold py-4 px-8 md:py-5 md:px-10 rounded-2xl text-base md:text-lg border border-white/20 hover:bg-white/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer"
              >
                <Truck size={18} />
                Каталог техники
              </Link>
            </div>

            <div className="mt-12 md:mt-16 flex justify-center">
              <ChevronDown
                size={24}
                className="text-white/40 animate-[bounce-soft_2s_ease-in-out_infinite]"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: TRUST BAR ─── */}
      <section className="bg-white dark:bg-dark-card py-8 border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-2">
              <Users size={18} className="text-brand-500" />
            </div>
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              <AnimatedCounter end={100} suffix="+" />
            </p>
            <p className="text-xs md:text-sm text-gray-400 dark:text-dark-muted mt-1">
              исполнителей
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-2">
              <Star size={18} className="text-brand-500" />
            </div>
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              <AnimatedCounter end={4.9} decimals={1} />
            </p>
            <p className="text-xs md:text-sm text-gray-400 dark:text-dark-muted mt-1">
              средний рейтинг
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-2">
              <Clock size={18} className="text-brand-500" />
            </div>
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              <AnimatedCounter end={15} suffix=" мин" />
            </p>
            <p className="text-xs md:text-sm text-gray-400 dark:text-dark-muted mt-1">
              среднее время отклика
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 3: UTP / WHY US ─── */}
      <section className="bg-gray-50 dark:bg-dark-bg py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              Комплексное решение — не просто кадры
            </h2>
            <p className="text-gray-500 dark:text-dark-muted mt-3 max-w-2xl mx-auto leading-relaxed">
              Мы не только закрываем кадровый вопрос, а делаем это под ключ:
              проверенные исполнители + вся необходимая техника в аренду со скидкой
            </p>
          </div>

          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal delay={0}>
              <div className="card-premium p-6 md:p-8 h-full">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-5">
                  <Users size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Проверенные кадры
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  Все исполнители с рейтингом и отзывами. Самозанятые и бригады — под любую задачу
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="card-premium p-6 md:p-8 h-full">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-5">
                  <Truck size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Техника в комплекте
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  Самосвалы, краны, вышки, строительный инструмент — со скидкой 15% при заказе исполнителей
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="card-premium p-6 md:p-8 h-full">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-5">
                  <Shield size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Безопасная сделка
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  Оплата картой, СБП или безналичным переводом от организации. Деньги в безопасности до завершения работы
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Section 4: TESTIMONIALS ─── */}
      <Testimonials />

      {/* ─── Section 5: HOW IT WORKS ─── */}
      <section className="bg-white dark:bg-dark-card py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white">
            Три шага к результату
          </h2>

          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 relative">
            {/* Decorative connector line (hidden on mobile) */}
            <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] divider-gradient" />

            <ScrollReveal delay={0}>
              <div className="text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto shadow-glow">
                  <span className="text-white text-lg font-bold">1</span>
                </div>
                <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
                  Опишите задачу
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  Заполните форму — адрес, тип работы, количество людей и часов. Добавьте технику при необходимости
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto shadow-glow">
                  <span className="text-white text-lg font-bold">2</span>
                </div>
                <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
                  Оплатите удобным способом
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  Моментальный расчёт. Оплата картой, через СБП или по реквизитам для организаций. Средства защищены до завершения
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto shadow-glow">
                  <span className="text-white text-lg font-bold">3</span>
                </div>
                <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
                  Получите результат
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  Проверенный исполнитель с техникой приедет в срок. Оцените работу — рейтинг влияет на будущие заказы
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Section 6: ROLE SELECTION ─── */}
      <section className="bg-gray-50 dark:bg-dark-bg py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white">
            Начните прямо сейчас
          </h2>
          <p className="text-center text-gray-500 dark:text-dark-muted mt-3">
            Выберите свою роль
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScrollReveal delay={0}>
              <Link
                href="/customer"
                className="group relative bg-white dark:bg-dark-card rounded-2xl p-6 border-2 border-transparent hover:border-brand-500 hover:shadow-lg transition-all duration-300 block cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-800/30 transition-colors duration-200">
                    <HardHat size={24} className="text-brand-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Я заказчик
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-muted">
                      Найти исполнителя и технику
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-gray-300 dark:text-dark-muted group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200"
                  />
                </div>
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <Link
                href="/worker"
                className="group relative bg-white dark:bg-dark-card rounded-2xl p-6 border-2 border-transparent hover:border-amber-400 hover:shadow-lg transition-all duration-300 block cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-800/30 transition-colors">
                    <Wrench size={24} className="text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Я исполнитель
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-muted">
                      Зарабатывать на заказах
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-gray-300 dark:text-dark-muted group-hover:text-amber-500 group-hover:translate-x-1 transition-all"
                  />
                </div>
              </Link>
            </ScrollReveal>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-4">
            Самозанятые получают заказы в приоритете &middot;{' '}
            <Link
              href="/selfemployed"
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              Подробнее
            </Link>
          </p>
        </div>
      </section>

      {/* ─── Section 7: CALCULATOR ─── */}
      <section className="bg-white dark:bg-dark-card py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white">
            Рассчитайте стоимость
          </h2>
          <div className="mt-10 max-w-md mx-auto">
            <CostCalculator />
          </div>
        </div>
      </section>

      {/* ─── Section 8: MATERIALS ─── */}
      <MaterialsSection />

      {/* ─── Section 8.5: MARKETPLACE PREVIEW ─── */}
      <section className="bg-white dark:bg-dark-card py-14 md:py-20 border-t border-gray-100 dark:border-dark-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="inline-block bg-brand-50 dark:bg-brand-900/30 text-brand-500 text-xs font-bold px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Новое
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              Маркетплейс материалов и спецтехники
            </h2>
            <p className="text-gray-500 dark:text-dark-muted mt-2">
              Сравните цены поставщиков и выберите лучшее предложение
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: '🏗', label: 'Бетон', hint: 'М100–М500', slug: 'concrete' },
              { icon: '🪨', label: 'Щебень', hint: '5–70 мм', slug: 'gravel' },
              { icon: '🚛', label: 'Самосвал', hint: 'Аренда / час', slug: 'dump-truck' },
              { icon: '🏗', label: 'Экскаватор', hint: 'Аренда / час', slug: 'excavator' },
            ].map((item) => (
              <Link
                key={item.slug}
                href={`/marketplace?cat=${item.slug}`}
                className="group bg-gray-50 dark:bg-dark-bg rounded-2xl p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border border-transparent hover:border-brand-200 dark:border-dark-border cursor-pointer"
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{item.label}</div>
                <div className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">{item.hint}</div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-all hover:shadow-md active:scale-95"
            >
              Все предложения →
            </Link>
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-3">
              Станьте поставщиком — размещение бесплатно
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 9: EQUIPMENT PREVIEW ─── */}
      <section className="bg-gray-50 dark:bg-dark-bg py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              Техника и спецтехника в аренду
            </h2>
            <p className="text-gray-500 dark:text-dark-muted mt-2">
              От перфоратора до самосвала — всё для вашего проекта
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/equipment?cat=garden"
              className="group bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-transparent hover:border-emerald-200 dark:border-dark-border cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Leaf size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">Сад</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">
                Газонокосилки, триммеры, бензопилы
              </p>
            </Link>

            <Link
              href="/equipment?cat=construction"
              className="group bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-transparent hover:border-amber-200 dark:border-dark-border cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Hammer size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">Стройка</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">
                Перфораторы, болгарки, плиткорез
              </p>
            </Link>

            <Link
              href="/equipment?cat=special"
              className="group bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-transparent hover:border-blue-200 dark:border-dark-border cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Zap size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">Спецтехника</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">
                Мойки, генераторы, компрессоры
              </p>
            </Link>

            <Link
              href="/equipment?cat=heavy"
              className="group bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-transparent hover:border-violet-200 dark:border-dark-border cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-800/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Building2 size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">Тяжёлая техника</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">
                Самосвалы, краны, вышки, экскаваторы
              </p>
            </Link>
          </div>

          <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800/30">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <Gift size={16} className="shrink-0" />
              Скидка 15% при заказе исполнителей + техники
            </p>
          </div>

          <p className="text-center mt-4">
            <Link
              href="/equipment"
              className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline"
            >
              Весь каталог
              <ArrowRight size={14} />
            </Link>
          </p>
        </div>
      </section>

      {/* ─── Section 9: FINAL CTA ─── */}
      <section className="relative bg-gradient-to-br from-[#0a0c14] via-brand-900 to-brand-700 py-20 md:py-28 overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gradient">
            Готовы начать?
          </h2>
          <p className="text-white/60 mt-3">
            Регистрация бесплатна. Первый заказ за 5 минут.
          </p>
          <Link
            href="/auth/register"
            className="mt-8 inline-flex items-center gap-2 bg-white text-brand-700 font-bold py-4 px-10 rounded-2xl text-lg shadow-hero hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
          >
            Начать бесплатно
            <ArrowRight size={20} />
          </Link>
          <p className="mt-4 text-sm text-white/40">
            Уже более 100 исполнителей на платформе
          </p>
        </div>
      </section>

      {/* ─── Section 10: FOOTER ─── */}
      <footer className="bg-[#060810] py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-white font-extrabold text-lg">Подряд PRO</p>
              <p className="text-gray-500 text-sm mt-1">Рабочие и техника под ключ</p>
            </div>
            <div className="flex items-center gap-3">
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                Telegram
              </a>
              <span className="text-gray-700">·</span>
              <a href={maxChannel} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                MAX
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            {/* Column 1: Заказчикам */}
            <div>
              <p className="font-semibold text-white mb-3">Заказчикам</p>
              <Link
                href="/app/order"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Оформить заказ
              </Link>
              <Link
                href="#calculator"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Калькулятор
              </Link>
              <Link
                href="/equipment"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Аренда техники
              </Link>
              <Link
                href="/materials"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Заказать материалы
              </Link>
              <Link
                href="/marketplace"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Маркетплейс
              </Link>
            </div>

            {/* Column 2: Исполнителям */}
            <div>
              <p className="font-semibold text-white mb-3">Исполнителям</p>
              <Link
                href="/dashboard"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Доска заказов
              </Link>
              <Link
                href="/selfemployed"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Самозанятым
              </Link>
              <Link
                href="/vip"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                VIP-подписка
              </Link>
            </div>

            {/* Column 3: Поставщикам */}
            <div>
              <p className="font-semibold text-white mb-3">Поставщикам</p>
              <Link
                href="/marketplace"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Маркетплейс
              </Link>
              <Link
                href="/auth/register"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Стать поставщиком
              </Link>
              <Link
                href="/supplier"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Кабинет поставщика
              </Link>
              <Link
                href="/privacy"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Политика
              </Link>
            </div>

            {/* Column 4: Поддержка */}
            <div>
              <p className="font-semibold text-white mb-3">Поддержка</p>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Telegram-бот
              </a>
              <a
                href={maxChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Канал MAX
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col items-center gap-2">
            <p className="text-gray-500 text-xs">
              &copy; {new Date().getFullYear()} Подряд PRO &middot; podryad.pro
            </p>
            <Link
              href="/privacy"
              className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
            >
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
