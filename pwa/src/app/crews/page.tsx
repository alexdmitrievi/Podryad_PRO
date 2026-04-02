import Link from 'next/link';
import {
  ArrowRight, Users, Shield, TrendingUp, CheckCircle2,
  Banknote, Star, Clock, HardHat,
} from 'lucide-react';

const HOW_IT_WORKS = [
  { step: 1, title: 'Зарегистрируйте бригаду', desc: 'Имя, состав, специализации, город. Занимает 3 минуты.' },
  { step: 2, title: 'Укажите ставки', desc: 'Вы сами называете цену — платформа добавит её в каталог.' },
  { step: 3, title: 'Получайте заказы', desc: 'Заявки от заказчиков — напрямую в Telegram или в личный кабинет.' },
  { step: 4, title: 'Деньги на карту', desc: 'После подтверждения выполнения — автоматическая выплата.' },
];

const FEATURES = [
  {
    icon: Banknote,
    title: 'Полностью бесплатно — навсегда',
    desc: 'Никаких взносов, подписок и скрытых платежей. Бесплатно сейчас и всегда.',
  },
  {
    icon: TrendingUp,
    title: 'Приоритет в выдаче',
    desc: 'Бригады показываются выше одиночных исполнителей — больше заказов.',
  },
  {
    icon: CheckCircle2,
    title: 'Бейдж «Бригада»',
    desc: 'Доверие с первого взгляда. Заказчики видят, что работает проверенная команда.',
  },
  {
    icon: Shield,
    title: 'Безопасная сделка',
    desc: 'Оплата через эскроу — деньги вам гарантированы после выполнения работ.',
  },
  {
    icon: Star,
    title: '100% вашей ставки',
    desc: 'Вы называете цену — вы её и получаете. Никаких комиссий с выплат.',
  },
  {
    icon: Clock,
    title: 'Заявки в течение дня',
    desc: 'Средний отклик заказчиков — 15 минут. Заполняйте расписание без простоев.',
  },
];

export default function CrewsPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0a0c14] via-brand-900 to-brand-700 text-white overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Users size={13} /> Для бригад и команд
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Подключите бригаду —<br />получайте заказы бесплатно
          </h1>
          <p className="mt-5 text-white/60 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Никаких комиссий. 100% стоимости работ — ваши.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/join/crew"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold py-4 px-8 rounded-2xl text-base shadow-hero hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
            >
              Подключить бригаду
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold py-4 px-8 rounded-2xl text-base hover:bg-white/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
            >
              <HardHat size={16} />
              Я одиночный исполнитель
            </Link>
          </div>

          <p className="mt-5 text-white/40 text-sm">
            Уже более 30 бригад на платформе · Омск и Новосибирск
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-dark-bg py-20">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-12">
            Почему бригады выбирают нас
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 flex gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-brand-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-dark-card py-20">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-12">
            Как это работает
          </h2>
          <div className="space-y-6 relative">
            <div className="absolute left-5 top-7 bottom-7 w-px bg-gray-100 dark:bg-dark-border" />
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-glow z-10">
                  <span className="text-white font-bold text-sm">{step}</span>
                </div>
                <div className="pt-2">
                  <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee strip */}
      <section className="bg-brand-50 dark:bg-brand-900/20 border-y border-brand-100 dark:border-brand-800/30 py-8">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <p className="text-brand-700 dark:text-brand-300 font-bold text-lg">
            Бесплатно. Никаких комиссий. 100% ставки — ваши.
          </p>
          <p className="text-brand-500 text-sm mt-1">
            Платформа зарабатывает иначе — не за счёт ваших выплат.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white dark:bg-dark-card py-20">
        <div className="max-w-md mx-auto px-5 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Готовы начать?
          </h2>
          <p className="text-gray-500 dark:text-dark-muted mt-2 text-sm">
            Регистрация за 3 минуты. Первые заявки — в тот же день.
          </p>
          <Link
            href="/join/crew"
            className="mt-7 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 px-10 rounded-2xl text-base transition-all hover:shadow-md active:scale-95"
          >
            Подключить бригаду
            <ArrowRight size={18} />
          </Link>
          <p className="mt-4 text-xs text-gray-400 dark:text-dark-muted">
            Уже зарегистрированы?{' '}
            <Link href="/auth/login" className="text-brand-500 hover:underline">
              Войти в кабинет
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
