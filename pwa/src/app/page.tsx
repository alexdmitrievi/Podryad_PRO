import Link from 'next/link';
import {
  ArrowRight, MapPin, Star, Users, MessageSquare,
  Shield, Zap, Crown, Trophy, ChevronRight,
} from 'lucide-react';
import CostCalculator from '@/components/CostCalculator';
import MessengerLinks from '@/components/MessengerLinks';

export default function HomePage() {
  const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

  return (
    <main className="min-h-screen flex flex-col bg-surface">
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="relative max-w-md mx-auto px-6 pt-16 pb-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
            <Zap size={14} />
            Работа и подработка в Омске и Новосибирске
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-balance">
            Подряд PRO
          </h1>
          <p className="text-lg text-white/80 max-w-xs mx-auto leading-relaxed">
            Грузчики · Уборка · Строительство · Любые задачи — быстро и надёжно
          </p>

          {/* VPN banner */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 text-sm text-white/80 border border-white/10">
            💡 Telegram заблокирован? Используйте{' '}
            <a href={maxChannel} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-white hover:text-white/90">
              MAX
            </a>{' '}
            — работает без VPN
          </div>

          <MessengerLinks action="bot" variant="buttons" />

          <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold py-3.5 px-6 rounded-2xl text-base shadow-sm hover:bg-white/95 active:scale-[0.97] transition-all duration-200"
            >
              Зарегистрироваться
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 text-white/90 font-medium py-2 text-sm border border-white/30 rounded-2xl hover:bg-white/10"
            >
              Войти
            </Link>
          </div>

          <Link
            href="/dashboard"
            className="
              flex items-center justify-center gap-2
              bg-white/15 backdrop-blur-sm text-white font-semibold
              py-3.5 px-6 rounded-2xl text-base
              border border-white/20 hover:bg-white/25
              active:scale-[0.97] transition-all duration-200
            "
          >
            <MapPin size={18} />
            Смотреть заказы
          </Link>

          <p className="text-xs text-white/60">
            Все деньги проходят через платформу. Гарантия выполнения.
          </p>

          {/* Trust badges */}
          <div className="flex justify-center gap-6 pt-2 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Shield size={14} /> Безопасно
            </span>
            <span className="flex items-center gap-1.5">
              <Star size={14} /> Рейтинг
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} /> Быстро
            </span>
          </div>
        </div>

        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48h1440V24C1200 0 240 0 0 24v24z" fill="#F7F9FC" />
          </svg>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-16 max-w-md mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-gray-900">Как это работает</h2>
          <p className="text-gray-500 text-sm mt-2">Всего 4 простых шага</p>
        </div>

        <div className="space-y-5">
          {[
            {
              num: '01',
              icon: MessageSquare,
              title: 'Опишите задачу',
              desc: 'Напишите боту в Telegram или MAX — платформа рассчитает стоимость по тарифам.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              num: '02',
              icon: MapPin,
              title: 'Заказ публикуется',
              desc: 'С точкой на карте, кнопкой навигации и всеми деталями — одновременно в Telegram и MAX.',
              color: 'from-emerald-500 to-emerald-600',
            },
            {
              num: '03',
              icon: Users,
              title: 'Исполнитель откликается',
              desc: 'Первый подходящий получает заказ. Контакты скрыты до завершения работы.',
              color: 'from-amber-500 to-amber-600',
            },
            {
              num: '04',
              icon: Star,
              title: 'Рейтинг и доверие',
              desc: 'После выполнения — взаимная оценка. Лучшие исполнители получают больше заказов.',
              color: 'from-purple-500 to-purple-600',
            },
          ].map((step, i) => (
            <div
              key={i}
              className="flex gap-4 items-start group"
            >
              <div className={`
                w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color}
                flex items-center justify-center shrink-0
                shadow-sm group-hover:scale-105 transition-transform duration-300
              `}>
                <step.icon size={20} className="text-white" />
              </div>
              <div className="pt-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-gray-300">{step.num}</span>
                  <h3 className="font-bold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role selection ── */}
      <section className="px-6 pb-6 max-w-md mx-auto w-full">
        <h2 className="text-xl font-extrabold text-center text-gray-900 mb-4">Кто вы?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/customer"
            className="
              group relative bg-white rounded-3xl p-5 shadow-card border border-gray-100
              hover:shadow-card-hover hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
              <span className="text-xl">🧾</span>
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Я заказчик</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Оформить заказ на грузчиков, уборку или другие работы
            </p>
            <ChevronRight size={16} className="absolute top-5 right-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
          </Link>
          <Link
            href="/worker"
            className="
              group relative bg-white rounded-3xl p-5 shadow-card border border-gray-100
              hover:shadow-card-hover hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
              <span className="text-xl">💼</span>
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Я исполнитель</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Смотреть заказы на карте и откликаться
            </p>
            <ChevronRight size={16} className="absolute top-5 right-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
          </Link>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          Самозанятые получают заказы в приоритете ·{' '}
          <Link href="/selfemployed" className="text-brand-500 hover:text-brand-700 font-medium transition-colors">
            Подробнее
          </Link>
        </p>
      </section>

      {/* ── Calculator ── */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Сколько стоит?</h2>
            <p className="text-gray-500 text-sm mt-2">Расчёт за несколько минут</p>
          </div>
          <CostCalculator />

          {/* Premium services */}
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-extrabold text-center text-gray-900">Дополнительные услуги</h2>
            <div className="space-y-3">
              <div className="
                bg-gradient-to-r from-amber-50 to-yellow-50
                rounded-3xl p-5 shadow-card border border-amber-100
                hover:shadow-card-hover transition-all duration-300
              ">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                      <Crown size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">VIP подписка</h3>
                      <p className="text-gray-500 text-xs">Ранний доступ к заказам</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-amber-600">{(1000).toLocaleString('ru-RU')}₽</span>
                    <span className="text-xs text-gray-400 block">/мес</span>
                  </div>
                </div>
              </div>

              <div className="
                bg-white rounded-3xl p-5 shadow-card border border-gray-100
                hover:shadow-card-hover transition-all duration-300
              ">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                      <Trophy size={20} className="text-brand-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Подбор ТОП-3</h3>
                      <p className="text-gray-500 text-xs">Персональная подборка</p>
                    </div>
                  </div>
                  <span className="text-2xl font-extrabold text-brand-500">{(1000).toLocaleString('ru-RU')}₽</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Аренда техники ── */}
      <section className="px-6 py-14 max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">
            🔧 Аренда техники
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Строительный инструмент и садовая техника — от 300₽/день
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/equipment?cat=garden"
            className="
              block bg-white rounded-3xl p-5 shadow-card border border-gray-100
              hover:shadow-card-hover hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            <h3 className="font-bold text-gray-900">🌿 Сад и участок</h3>
            <p className="text-xs text-gray-500 mt-1">
              Газонокосилки, триммеры, бензопилы, снегоуборщик
            </p>
          </Link>
          <Link
            href="/equipment?cat=construction"
            className="
              block bg-white rounded-3xl p-5 shadow-card border border-gray-100
              hover:shadow-card-hover hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            <h3 className="font-bold text-gray-900">🔨 Стройка и ремонт</h3>
            <p className="text-xs text-gray-500 mt-1">
              Перфораторы, болгарки, плиткорез, строительный пылесос
            </p>
          </Link>
          <Link
            href="/equipment?cat=special"
            className="
              block bg-white rounded-3xl p-5 shadow-card border border-gray-100
              hover:shadow-card-hover hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            <h3 className="font-bold text-gray-900">⚡ Спецтехника</h3>
            <p className="text-xs text-gray-500 mt-1">
              Мойка высокого давления, бензогенератор
            </p>
          </Link>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-sm text-amber-800">
            🎁 Скидка 15% при заказе исполнителей + техники
          </p>
        </div>

        <Link
          href="/equipment"
          className="block mt-4 text-center text-[#0088cc] text-sm font-medium hover:text-[#0077b3] transition-colors"
        >
          Смотреть весь каталог →
        </Link>
      </section>

      {/* ── CTA + Footer ── */}
      <section className="px-6 py-14 max-w-md mx-auto w-full space-y-8">
        <MessengerLinks action="order" variant="buttons" />

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-2">Исполнителям</p>
            <div className="space-y-1.5">
              <Link href="/dashboard" className="block text-gray-400 hover:text-brand-500 transition-colors">
                Смотреть заказы
              </Link>
              <Link href="/selfemployed" className="block text-gray-400 hover:text-brand-500 transition-colors">
                Как стать самозанятым
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Заказчикам</p>
            <div className="space-y-1.5">
              <Link href="/app/order" className="block text-gray-400 hover:text-brand-500 transition-colors">
                Оформить заказ
              </Link>
              <Link href="/equipment" className="block text-gray-400 hover:text-brand-500 transition-colors">
                Аренда техники
              </Link>
              <Link href="/app/payments" className="block text-gray-400 hover:text-brand-500 transition-colors">
                Тарифы
              </Link>
            </div>
          </div>
        </div>

        <p className="text-gray-300 text-xs text-center">
          © {new Date().getFullYear()} Подряд PRO · podryad.pro
        </p>
      </section>
    </main>
  );
}
