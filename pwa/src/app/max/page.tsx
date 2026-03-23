import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, MapPin, Shield, Zap, MessageSquare,
  ChevronDown, ExternalLink, ArrowLeft,
} from 'lucide-react';
import MessengerLinks from '@/components/MessengerLinks';

export const metadata: Metadata = {
  title: 'Подряд PRO в MAX — работа и подработка Омск и Новосибирск без VPN',
  description:
    'Заказы на грузчиков, уборку, строительство в Омске и Новосибирске. Канал в мессенджере MAX — работает без VPN на территории РФ.',
  keywords:
    'работа омск max, подработка max мессенджер, грузчики омск, новосибирск, работа новосибирск, подряд pro max, работа без vpn',
  openGraph: {
    title: 'Подряд PRO в MAX — работа Омск и Новосибирск без VPN',
    description: 'Заказы на грузчиков, уборку, строительство в Омске и Новосибирске. Канал в MAX — работает без VPN.',
    type: 'website',
    url: 'https://podryad.pro/max',
    siteName: 'Подряд PRO',
  },
};

const FAQ = [
  {
    q: 'Что такое MAX?',
    a: 'MAX — российский мессенджер от VK. Работает без VPN на всей территории России. Скачать можно в App Store, Google Play и RuStore.',
  },
  {
    q: 'Чем MAX отличается от Telegram?',
    a: 'Ничем в плане заказов — те же самые заказы публикуются одновременно в оба канала. MAX просто работает без VPN.',
  },
  {
    q: 'Как получать заказы в MAX?',
    a: 'Подпишитесь на наш канал в MAX — все новые заказы будут приходить автоматически. Откликнуться можно через сайт podryad.pro.',
  },
  {
    q: 'Можно ли пользоваться обоими?',
    a: 'Да! Заказы дублируются, используйте тот мессенджер, который вам удобнее.',
  },
  {
    q: 'Как оплатить заказ через MAX?',
    a: 'Оплата производится через сайт или Telegram-бот. В MAX-канале публикуются заказы с кнопкой перехода на сайт.',
  },
];

export default function MaxPage() {
  const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

  return (
    <main className="min-h-screen bg-surface dark:bg-dark-bg pt-16">
      {/* Header */}
      <header className="bg-gradient-to-r from-max to-max-dark text-white px-5 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Подряд PRO в MAX</h1>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Главная
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-max via-max to-max-dark text-white px-6 pt-12 pb-16 text-center relative overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="relative max-w-md mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
            <Shield size={14} />
            Работает без VPN
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-balance">
            Подряд PRO теперь в MAX
          </h2>
          <p className="text-white/80 max-w-xs mx-auto leading-relaxed">
            Все заказы на грузчиков, уборку и строительство в Омске и Новосибирске — 
            в российском мессенджере без ограничений
          </p>

          <a
            href={maxChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="
              group inline-flex items-center justify-center gap-2
              bg-white text-max font-bold py-3.5 px-8 rounded-2xl text-base
              hover:bg-gray-50 active:scale-[0.97]
              transition-all duration-200 shadow-elevated
            "
          >
            Открыть канал в MAX
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48h1440V24C1200 0 240 0 0 24v24z" fill="#F7F9FC" />
          </svg>
        </div>
      </section>

      {/* Why MAX */}
      <section className="px-6 py-14 max-w-md mx-auto">
        <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-8">Почему MAX?</h2>
        <div className="space-y-5">
          {[
            {
              icon: Shield,
              title: 'Без VPN и блокировок',
              desc: 'MAX работает на территории РФ без каких-либо ограничений и VPN.',
              color: 'from-emerald-500 to-emerald-600',
            },
            {
              icon: Zap,
              title: 'Те же заказы мгновенно',
              desc: 'Каждый заказ из Telegram автоматически дублируется в MAX — ничего не пропустите.',
              color: 'from-amber-500 to-amber-600',
            },
            {
              icon: MapPin,
              title: 'Карта и навигация',
              desc: 'Все заказы с точкой на карте и кнопкой навигации — как в Telegram.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              icon: MessageSquare,
              title: 'Удобный интерфейс',
              desc: 'Знакомый интерфейс мессенджера от VK. Доступен в App Store, Google Play и RuStore.',
              color: 'from-purple-500 to-purple-600',
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start group">
              <div className={`
                w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color}
                flex items-center justify-center shrink-0
                shadow-sm group-hover:scale-105 transition-transform duration-300
              `}>
                <item.icon size={20} className="text-white" />
              </div>
              <div className="pt-0.5">
                <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-gray-500 dark:text-dark-muted text-sm mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to subscribe */}
      <section className="bg-gray-50 dark:bg-dark-bg px-6 py-14">
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white">Как подписаться</h2>
          <div className="space-y-4">
            {[
              { num: '1', text: 'Установите MAX из App Store, Google Play или RuStore' },
              { num: '2', text: 'Перейдите в наш канал по ссылке ниже' },
              { num: '3', text: 'Нажмите «Подписаться» — готово!' },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-4 bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card border border-gray-100 dark:border-dark-border">
                <div className="w-10 h-10 rounded-full bg-max text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {step.num}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{step.text}</p>
              </div>
            ))}
          </div>

          <a
            href={maxChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="
              group flex items-center justify-center gap-2 w-full
              bg-max text-white font-bold py-4 px-8
              rounded-2xl text-base hover:bg-max-dark
              active:scale-[0.97] transition-all duration-200
              shadow-lg shadow-max/25
            "
          >
            Подписаться на канал
            <ExternalLink size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-14 max-w-md mx-auto">
        <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-8">Частые вопросы</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-card border border-gray-100 dark:border-dark-border group"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                <span className="font-semibold text-sm text-gray-900 dark:text-white pr-4">{item.q}</span>
                <ChevronDown size={18} className="text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-0">
                <p className="text-sm text-gray-500 dark:text-dark-muted leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-14 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Выберите удобный мессенджер</h2>
          <p className="text-gray-500 dark:text-dark-muted text-sm">Заказы одинаковые — выбирайте, что удобнее</p>
        </div>
        <div className="mt-6 space-y-4">
          <MessengerLinks action="channel" variant="buttons" />
          <Link
            href="/dashboard"
            className="
              flex h-14 min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-2xl
              bg-gray-100 px-4 text-base font-semibold text-gray-700
              transition-all duration-200 hover:bg-gray-200 active:scale-[0.98]
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400
            "
          >
            <MapPin size={18} className="shrink-0" aria-hidden />
            Смотреть заказы
          </Link>
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-8 text-center">
          © {new Date().getFullYear()} Подряд PRO · podryad.pro
        </p>
      </section>
    </main>
  );
}
