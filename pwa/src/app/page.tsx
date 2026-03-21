import Link from 'next/link';
import {
  ArrowRight, MapPin, Star, Users, MessageSquare,
  Shield, Zap, Crown, Trophy, ChevronRight,
} from 'lucide-react';
import CostCalculator from '@/components/CostCalculator';

const tgBot = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannelUrl =
  process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';
const telegramUrl = `https://t.me/${tgBot}`;

const cardBase =
  'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-surface">
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="relative max-w-2xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
            <Zap size={14} />
            Работа и подработка в Омске и Новосибирске
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-balance">
            Подряд PRO
          </h1>
          <p className="text-lg text-white/80 max-w-xs md:max-w-lg mx-auto leading-relaxed">
            Грузчики · Уборка · Строительство · Любые задачи — быстро и надёжно
          </p>

          <div className="pt-2">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0088cc] font-bold py-4 px-8 md:px-12 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-shadow duration-200 md:w-auto"
            >
              Начать бесплатно
              <ArrowRight size={20} />
            </Link>
          </div>

          <p className="text-white/60 text-sm">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="text-white font-medium underline underline-offset-2 hover:text-white/90">
              Войти
            </Link>
          </p>

          <p className="text-white/50 text-xs flex flex-wrap justify-center gap-x-6 md:gap-x-10 gap-y-1">
            <span>100+ исполнителей</span>
            <span>·</span>
            <span>50+ заказов</span>
            <span>·</span>
            <span>⭐ 4.9 рейтинг</span>
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

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48h1440V24C1200 0 240 0 0 24v24z" fill="#F7F9FC" />
          </svg>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-gray-900">Как это работает</h2>
          <p className="text-gray-500 text-sm mt-2">Всего 4 простых шага</p>
        </div>

        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {[
            {
              num: '01',
              icon: MessageSquare,
              title: 'Опишите задачу',
              desc: 'Опишите задачу на сайте или в приложении — платформа рассчитает стоимость.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              num: '02',
              icon: MapPin,
              title: 'Заказ публикуется',
              desc: 'С точкой на карте, кнопкой навигации и всеми деталями.',
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
              className="flex gap-4 items-start group md:bg-white md:rounded-2xl md:p-6 md:shadow-sm md:border md:border-gray-100"
            >
              <div
                className={`
                w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color}
                flex items-center justify-center shrink-0
                shadow-sm group-hover:scale-105 transition-transform duration-300
              `}
              >
                <step.icon size={20} className="text-white" />
              </div>
              <div className="pt-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-gray-300">{step.num}</span>
                  <h3 className="font-bold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role selection ── */}
      <section className="px-6 py-16 max-w-2xl mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Кто вы?</h2>
          <p className="text-gray-500 text-sm mt-2">Выберите роль</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/customer"
            className="
              group relative bg-white rounded-3xl p-6
              shadow-sm border-2 border-gray-100
              hover:border-[#0088cc] hover:shadow-lg hover:-translate-y-1
              transition-all duration-300
            "
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4
                    group-hover:bg-blue-200 transition-colors">
              <span className="text-3xl">🧾</span>
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">Я заказчик</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Оформить заказ — от грузчиков до ремонта
            </p>
            <div className="absolute top-6 right-5 w-8 h-8 rounded-full bg-gray-50
                    flex items-center justify-center
                    group-hover:bg-[#0088cc] transition-colors">
              <ChevronRight size={16} className="text-gray-300 group-hover:text-white transition-colors" />
            </div>
          </Link>

          <Link
            href="/worker"
            className="
              group relative bg-white rounded-3xl p-6
              shadow-sm border-2 border-gray-100
              hover:border-amber-400 hover:shadow-lg hover:-translate-y-1
              transition-all duration-300
            "
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4
                    group-hover:bg-amber-200 transition-colors">
              <span className="text-3xl">💼</span>
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">Я исполнитель</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Брать заказы и зарабатывать
            </p>
            <div className="absolute top-6 right-5 w-8 h-8 rounded-full bg-gray-50
                    flex items-center justify-center
                    group-hover:bg-amber-400 transition-colors">
              <ChevronRight size={16} className="text-gray-300 group-hover:text-white transition-colors" />
            </div>
          </Link>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          Самозанятые получают заказы в приоритете ·{' '}
          <Link href="/selfemployed" className="text-[#0088cc] hover:text-[#0077b3] font-medium transition-colors">
            Подробнее
          </Link>
        </p>
        <div className="text-center mt-6">
          <Link href="/dashboard" className="text-[#0088cc] font-medium text-sm hover:underline underline-offset-2">
            Смотреть заказы →
          </Link>
        </div>
      </section>

      {/* ── Calculator ── */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Сколько стоит?</h2>
            <p className="text-gray-500 text-sm mt-2">Расчёт за несколько минут</p>
          </div>
          <CostCalculator />
        </div>

        <div className="max-w-2xl mx-auto space-y-4 pt-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Дополнительные услуги</h2>
            <p className="text-gray-500 text-sm mt-2">Расширьте возможности на платформе</p>
          </div>
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              <div
                className={`
                bg-gradient-to-r from-amber-50 to-yellow-50
                rounded-2xl p-5 shadow-sm border border-amber-100
                hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
              `}
              >
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
                    <span className="text-2xl font-extrabold text-amber-600">
                      {(1000).toLocaleString('ru-RU')}₽
                    </span>
                    <span className="text-xs text-gray-400 block">/мес</span>
                  </div>
                </div>
              </div>

              <div className={cardBase}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Trophy size={20} className="text-[#0088cc]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Подбор ТОП-3</h3>
                      <p className="text-gray-500 text-xs">Персональная подборка</p>
                    </div>
                  </div>
                  <span className="text-2xl font-extrabold text-[#0088cc]">
                    {(1000).toLocaleString('ru-RU')}₽
                  </span>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* ── Аренда техники ── */}
      <section className="px-6 py-16 max-w-2xl mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Аренда техники</h2>
          <p className="text-gray-500 text-sm mt-2">
            Инструмент в аренду — дешевле, чем покупать
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Строительный инструмент и садовая техника — от 300₽/день
          </p>
        </div>

        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          <Link
            href="/equipment?cat=garden"
            className={`
              block ${cardBase}
              bg-emerald-50 border-emerald-200 hover:border-emerald-300
            `}
          >
            <h3 className="font-bold text-gray-900">🌿 Сад и участок</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Газонокосилки, триммеры, бензопилы, снегоуборщик
            </p>
          </Link>
          <Link
            href="/equipment?cat=construction"
            className={`
              block ${cardBase}
              bg-amber-50 border-amber-200 hover:border-amber-300
            `}
          >
            <h3 className="font-bold text-gray-900">🔨 Стройка и ремонт</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Перфораторы, болгарки, плиткорез, строительный пылесос
            </p>
          </Link>
          <Link
            href="/equipment?cat=special"
            className={`
              block ${cardBase}
              bg-blue-50 border-blue-200 hover:border-blue-300
            `}
          >
            <h3 className="font-bold text-gray-900">⚡ Спецтехника</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
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

      {/* ── CTA ── */}
      <section className="px-6 py-16 max-w-xl mx-auto w-full">
        <Link
          href="/auth/register"
          className="
            flex items-center justify-center gap-2 w-full
            md:w-auto md:mx-auto md:px-16
            bg-[#0088cc] text-white font-bold py-4 rounded-2xl
            shadow-lg text-lg hover:opacity-95 active:scale-[0.99]
            transition-all duration-200
          "
        >
          Начать бесплатно
          <ArrowRight size={22} />
        </Link>
        <p className="text-center text-gray-500 text-sm mt-4">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-[#0088cc] font-medium hover:underline underline-offset-2">
            Войти
          </Link>
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 pb-12 max-w-2xl mx-auto w-full border-t border-gray-100 pt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="font-semibold text-gray-900 mb-3">Исполнителям</p>
            <div className="space-y-2">
              <Link href="/dashboard" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Смотреть заказы
              </Link>
              <Link href="/selfemployed" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Как стать самозанятым
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-3">Заказчикам</p>
            <div className="space-y-2">
              <Link href="/app/order" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Оформить заказ
              </Link>
              <Link href="/equipment" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Аренда техники
              </Link>
              <Link href="/app/payments" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Тарифы
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-3">Платформа</p>
            <div className="space-y-2">
              <Link href="/" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                О нас
              </Link>
              <Link href="/app/payments" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Тарифы
              </Link>
              <Link href="/equipment" className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed">
                Аренда техники
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-3">Поддержка</p>
            <div className="space-y-2">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed"
              >
                Telegram
              </a>
              <a
                href={maxChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed"
              >
                MAX
              </a>
              <a
                href="https://podryad.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-[#0088cc] transition-colors leading-relaxed"
              >
                podryad.pro
              </a>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm mt-8 text-center">
          Мы в мессенджерах:{' '}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0088cc] font-medium hover:underline underline-offset-2"
          >
            Telegram
          </a>
          <span className="text-gray-300 mx-1.5">·</span>
          <a
            href={maxChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0088cc] font-medium hover:underline underline-offset-2"
          >
            MAX
          </a>
        </p>

        <p className="text-gray-400 text-xs text-center mt-4 leading-relaxed">
          💡 Telegram заблокирован? MAX работает без VPN
        </p>

        <p className="text-gray-400 text-xs text-center mt-6">
          © 2026 Подряд PRO · podryad.pro
        </p>
      </footer>
    </main>
  );
}
