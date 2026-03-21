import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import CostCalculator from '@/components/CostCalculator';

const tgBot = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel =
  process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';
const telegramUrl = `https://t.me/${tgBot}`;

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Секция 1: Hero */}
      <section className="bg-gradient-to-br from-[#1a1f6c] via-[#2d35a8] to-[#4f5bd5] text-white">
        <div className="max-w-2xl mx-auto px-6 pt-28 pb-24 md:pt-40 md:pb-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Найдём исполнителя за 15 минут
          </h1>
          <p className="text-base md:text-xl text-white/60 mt-4 md:mt-6 max-w-md md:max-w-xl mx-auto">
            Грузчики, уборка, ремонт и аренда техники — в Омске и Новосибирске
          </p>
          <Link
            href="/app/order"
            className="mt-8 md:mt-10 inline-flex items-center gap-2 bg-white text-[#2d35a8] font-bold py-4 px-8 md:py-5 md:px-10 rounded-2xl text-base md:text-lg shadow-xl shadow-white/10 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5 transition-all duration-300"
          >
            Оформить заказ →
          </Link>
          <p className="mt-4 text-sm text-white/40">
            Регистрация бесплатно ·{' '}
            <Link
              href="/auth/login"
              className="text-white/60 underline underline-offset-2 hover:text-white/80"
            >
              Войти
            </Link>
          </p>
        </div>
      </section>

      {/* Секция 2: Цифры */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900">
              100+
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">исполнителей</p>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900">
              4.9
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              средний рейтинг
            </p>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900">
              15 мин
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              среднее время отклика
            </p>
          </div>
        </div>
      </section>

      {/* Секция 3: Как это работает */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900">
            Как это работает
          </h2>

          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2d35a8] flex items-center justify-center mx-auto">
                <span className="text-white text-lg font-bold">1</span>
              </div>
              <h3 className="mt-4 font-bold text-gray-900">Опишите задачу</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Заполните форму на сайте — адрес, тип работы, сколько людей и на
                сколько часов
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2d35a8] flex items-center justify-center mx-auto">
                <span className="text-white text-lg font-bold">2</span>
              </div>
              <h3 className="mt-4 font-bold text-gray-900">Оплатите онлайн</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Платформа рассчитает стоимость. Оплата картой или через СБП.
                Деньги в безопасности до завершения
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2d35a8] flex items-center justify-center mx-auto">
                <span className="text-white text-lg font-bold">3</span>
              </div>
              <h3 className="mt-4 font-bold text-gray-900">
                Исполнитель приедет
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Проверенный исполнитель с рейтингом откликнется и выполнит
                работу. Вы оцените результат
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Секция 4: Выбор роли */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900">
            Начните сейчас
          </h2>
          <p className="text-center text-gray-500 mt-3">Выберите свою роль</p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/customer"
              className="group relative bg-gray-50 rounded-2xl p-6 border-2 border-transparent hover:border-[#2d35a8] hover:bg-white hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2d35a8]/10 flex items-center justify-center group-hover:bg-[#2d35a8]/20 transition-colors">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Я заказчик</h3>
                  <p className="text-sm text-gray-500">Найти исполнителя</p>
                </div>
              </div>
            </Link>

            <Link
              href="/worker"
              className="group relative bg-gray-50 rounded-2xl p-6 border-2 border-transparent hover:border-amber-400 hover:bg-white hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <span className="text-2xl">💼</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Я исполнитель</h3>
                  <p className="text-sm text-gray-500">Зарабатывать на заказах</p>
                </div>
              </div>
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Самозанятые получают заказы в приоритете ·{' '}
            <Link
              href="/selfemployed"
              className="text-[#2d35a8] hover:underline"
            >
              Подробнее
            </Link>
          </p>
        </div>
      </section>

      {/* Секция 5: Калькулятор */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900">
            Сколько стоит
          </h2>
          <div className="mt-10 max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <CostCalculator />
          </div>
        </div>
      </section>

      {/* Секция 6: Аренда техники */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Аренда техники
            </h2>
            <p className="text-gray-500 mt-2">
              Инструмент дешевле арендовать, чем покупать
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/equipment?cat=garden"
              className="bg-emerald-50 rounded-2xl p-5 hover:shadow-md transition-all"
            >
              <p className="font-bold text-gray-900">🌿 Сад</p>
              <p className="text-sm text-gray-500 mt-1">
                Газонокосилки, триммеры, бензопилы
              </p>
            </Link>

            <Link
              href="/equipment?cat=construction"
              className="bg-amber-50 rounded-2xl p-5 hover:shadow-md transition-all"
            >
              <p className="font-bold text-gray-900">🔨 Стройка</p>
              <p className="text-sm text-gray-500 mt-1">
                Перфораторы, болгарки, плиткорез
              </p>
            </Link>

            <Link
              href="/equipment?cat=special"
              className="bg-blue-50 rounded-2xl p-5 hover:shadow-md transition-all"
            >
              <p className="font-bold text-gray-900">⚡ Спецтехника</p>
              <p className="text-sm text-gray-500 mt-1">Мойка, генератор</p>
            </Link>
          </div>

          <div className="mt-6 bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800">
              🎁 Скидка 15% при заказе исполнителей + техники
            </p>
          </div>

          <p className="text-center mt-4">
            <Link
              href="/equipment"
              className="text-[#2d35a8] text-sm font-medium hover:underline"
            >
              Весь каталог →
            </Link>
          </p>
        </div>
      </section>

      {/* Секция 7: Финальный CTA */}
      <section className="bg-gradient-to-br from-[#1a1f6c] via-[#2d35a8] to-[#4f5bd5] py-20 md:py-28">
        <div className="max-w-lg mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Готовы начать?
          </h2>
          <p className="text-white/60 mt-3">
            Регистрация бесплатна. Первый заказ — за 5 минут.
          </p>
          <Link
            href="/auth/register"
            className="mt-8 inline-flex items-center gap-2 bg-white text-[#2d35a8] font-bold py-4 px-10 rounded-2xl text-lg shadow-xl shadow-white/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
          >
            Начать бесплатно
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Секция 8: Footer */}
      <footer className="bg-gray-900 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
              <p className="font-semibold text-white mb-3">Заказчикам</p>
              <Link
                href="/app/order"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Оформить заказ
              </Link>
              <Link
                href="/app/payments"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Тарифы
              </Link>
              <Link
                href="/equipment"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Аренда техники
              </Link>
            </div>
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
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="font-semibold text-white mb-3">Контакты</p>
              <p className="text-gray-400 py-1">Омск и Новосибирск</p>
              <div className="flex gap-4 mt-2">
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Telegram
                </a>
                <a
                  href={maxChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  MAX
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Подряд PRO · podryad.pro
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
