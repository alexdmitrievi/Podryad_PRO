import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

export default function CustomerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="🧾 Для заказчиков" backHref="/" />

      <div className="max-w-lg mx-auto p-4 space-y-6 pb-10">

        {/* ══ Блок 1: Как заказать работу ══ */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900 px-1 mb-5">
            Как заказать работу
          </h2>

          <div className="space-y-4">
            {/* Шаг 1 */}
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-extrabold">
                  1
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Зарегистрируйтесь в боте</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Откройте бот @{botName} в Telegram,
                    нажмите «Начать» и выберите «Я заказчик». Бот запомнит вас —
                    регистрация занимает 30 секунд.
                  </p>
                  <a
                    href={`https://t.me/${botName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-5 py-2.5 rounded-2xl bg-brand-500 text-white text-sm font-semibold transition-all hover:bg-brand-600 active:scale-[0.98] shadow-sm"
                  >
                    📱 Открыть бот
                  </a>
                  <p className="text-xs text-gray-400 mt-2">
                    Telegram недоступен?{' '}
                    <a
                      href={maxChannel}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 font-medium hover:underline"
                    >
                      Написать в MAX →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Стрелка */}
            <div className="flex justify-center">
              <span className="text-gray-300 text-2xl">↓</span>
            </div>

            {/* Шаг 2 */}
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-extrabold">
                  2
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Опишите задачу</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Напишите боту что нужно сделать. Пример:
                    «Нужны 2 грузчика на ул. Ленина 50, завтра в 10:00».
                    Или заполните форму на сайте — бот рассчитает стоимость.
                  </p>
                  <Link
                    href="/app/order"
                    className="inline-block mt-3 px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
                  >
                    📝 Оформить заказ
                  </Link>
                </div>
              </div>
            </div>

            {/* Стрелка */}
            <div className="flex justify-center">
              <span className="text-gray-300 text-2xl">↓</span>
            </div>

            {/* Шаг 3 */}
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-extrabold">
                  3
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Оплатите и ждите исполнителя</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Бот пришлёт точную стоимость. Оплатите через ЮKassa
                    (карта, SBP, кошелёк). Заказ опубликуется в канале, исполнитель
                    откликнется — вы получите уведомление.
                  </p>
                </div>
              </div>
            </div>

            {/* Стрелка */}
            <div className="flex justify-center">
              <span className="text-gray-300 text-2xl">↓</span>
            </div>

            {/* Шаг 4 */}
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-extrabold">
                  4
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Оцените работу</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    После выполнения бот пришлёт короткий опрос — оцените
                    исполнителя от 1 до 5 звёзд. Это занимает 5 секунд и помогает
                    поддерживать качество на платформе. При оценке ниже 3 — мы
                    разберёмся в ситуации и вернём деньги если работа не выполнена.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Блок 2: Гарантии ══ */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900 px-1 mb-4">
            Ваши гарантии
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 text-center">
              <span className="text-3xl block mb-3">🛡</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Безопасная оплата</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Деньги списываются только после вашего подтверждения
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 text-center">
              <span className="text-3xl block mb-3">↩️</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Возврат при неявке</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Если исполнитель не вышел — полный возврат средств
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 text-center">
              <span className="text-3xl block mb-3">⭐</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Проверенные исполнители</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Рейтинг, отзывы, модерация — только надёжные люди
              </p>
            </div>
          </div>
        </section>

        {/* ══ Блок 3: Тарифы ══ */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">
            Сколько стоит
          </h2>

          <div className="space-y-3">
            {[
              { emoji: '💪', label: 'Грузчики', price: '700' },
              { emoji: '🧹', label: 'Уборка', price: '600' },
              { emoji: '🏗', label: 'Стройка', price: '900' },
              { emoji: '🔧', label: 'Разнорабочие', price: '650' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm text-gray-700">
                  {item.emoji} {item.label}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  от {item.price}₽/час
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Точная стоимость зависит от количества людей и часов.{' '}
            <Link href="/app/order" className="text-brand-500 font-medium hover:underline">
              Рассчитать стоимость →
            </Link>
          </p>
        </section>

        {/* ══ Блок 4: CTA ══ */}
        <section className="space-y-3">
          <a
            href={`https://t.me/${botName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3.5 rounded-xl font-bold text-base bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-[0.98] shadow-md shadow-brand-500/20"
          >
            📱 Зарегистрироваться в боте
          </a>
          <Link
            href="/app/order"
            className="block w-full text-center py-3.5 rounded-2xl font-bold text-base bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-[0.98]"
          >
            📝 Оформить заказ на сайте
          </Link>
        </section>
      </div>
    </div>
  );
}
