import Link from 'next/link';
import { AuthenticatedPushPrompt } from '@/components/NotificationSettings';
import PageHeader from '@/components/PageHeader';

const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

export default function WorkerPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <PageHeader title="💼 Для исполнителей" backHref="/" />

      <div className="max-w-lg mx-auto p-4 space-y-6 pb-10">
        <AuthenticatedPushPrompt role="worker" className="mb-2" />

        {/* ══ Блок 1: Как начать зарабатывать ══ */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900 px-1 mb-5">
            Как начать зарабатывать
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
                    нажмите «Начать» и выберите «Я исполнитель».
                    Укажите имя, телефон и навыки (грузчик, уборка, стройка...).
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
                  <h3 className="font-bold text-gray-900 mb-1">Оформите самозанятость (рекомендуем)</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Самозанятые получают заказы ПЕРВЫМИ и выплаты быстрее.
                    Оформить можно за 5 минут — бесплатно, онлайн.
                  </p>
                  <Link
                    href="/selfemployed"
                    className="inline-block mt-3 px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
                  >
                    📋 Инструкция за 5 минут
                  </Link>
                  <p className="text-xs text-gray-400 mt-2">
                    Без самозанятости тоже можно работать, но приоритет у самозанятых.
                  </p>
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
                  <h3 className="font-bold text-gray-900 mb-1">Берите заказы</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Заказы публикуются в канале. Увидели подходящий — нажмите
                    «Беру заказ». Первый подходящий исполнитель получает работу.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-block mt-3 px-5 py-2.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
                  >
                    📋 Смотреть заказы
                  </Link>
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
                  <h3 className="font-bold text-gray-900 mb-1">Получайте оплату</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Выполнили работу → нажмите /done в боте → заказчик
                    ставит оценку от 1 до 5 звёзд → при оценке 3+ деньги
                    автоматически на карту в течение 24 часов.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Блок 2: Как работает рейтинг ══ */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900 px-1 mb-3">
            Как работает рейтинг
          </h2>
          <p className="text-sm text-gray-600 px-1 mb-4 leading-relaxed">
            Ваш рейтинг — главный показатель надёжности.
            Чем выше рейтинг, тем больше заказов вы получаете.
          </p>

          <div className="space-y-3">
            <div className="bg-white rounded-3xl p-5 shadow-card border border-emerald-100">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⭐</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Оценка 4-5 — всё отлично</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Рейтинг растёт. Выплата автоматически в течение 24 часов.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⭐</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Оценка 3 — нормально</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Рейтинг не меняется. Выплата проходит в течение 24 часов.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-amber-100">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Оценка 1-2 — есть проблемы</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Рейтинг снижается. Выплата замораживается до разбора ситуации.
                    При повторных низких оценках — временная блокировка.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 px-1 leading-relaxed">
            Начальный рейтинг: 5.0. Минимальный для получения заказов: 4.0.
            Рейтинг пересчитывается после каждого заказа как среднее всех оценок.
          </p>
        </section>

        {/* ══ Блок 3: Сколько можно заработать ══ */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900 px-1 mb-4">
            Сколько зарабатывают
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 text-center">
              <span className="text-3xl block mb-3">💪</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Грузчик</h3>
              <p className="text-lg font-extrabold text-emerald-600">от 3 000₽/день</p>
              <p className="text-xs text-gray-400 mt-1">2 заказа × 3 часа</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 text-center">
              <span className="text-3xl block mb-3">🧹</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Уборщик</h3>
              <p className="text-lg font-extrabold text-emerald-600">от 2 400₽/день</p>
              <p className="text-xs text-gray-400 mt-1">3 заказа × 2 часа</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 text-center">
              <span className="text-3xl block mb-3">🏗</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Строитель</h3>
              <p className="text-lg font-extrabold text-emerald-600">от 3 250₽/день</p>
              <p className="text-xs text-gray-400 mt-1">1 заказ × 5 часов</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 px-1 leading-relaxed">
            Ставка указывается в каждом заказе.
            Вы видите сумму ДО того как берёте заказ.
          </p>
        </section>

        {/* ══ Блок 4: Требования ══ */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900 px-1 mb-4">
            Что нужно для работы
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm mb-3">✅ Обязательно</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">—</span>
                  Возраст от 18 лет
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">—</span>
                  Телефон с Telegram или MAX
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">—</span>
                  Готовность работать в Омске или Новосибирске
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-amber-100">
              <h3 className="font-bold text-gray-900 text-sm mb-3">⚡ Приоритет</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">—</span>
                  <span>
                    Статус самозанятого →{' '}
                    <Link href="/selfemployed" className="text-brand-500 font-medium hover:underline">
                      Оформить за 5 мин
                    </Link>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">—</span>
                  Рейтинг 4.0 и выше (растёт с каждым заказом)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">—</span>
                  VIP подписка → ранний доступ к заказам
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ══ Блок 5: CTA ══ */}
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
            href="/dashboard"
            className="block w-full text-center py-3.5 rounded-2xl font-bold text-base bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-[0.98]"
          >
            📋 Смотреть заказы
          </Link>
        </section>
      </div>
    </div>
  );
}
