import Link from 'next/link';
import CostCalculator from '@/components/CostCalculator';

export default function HomePage() {
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0088cc] to-[#005580] text-white px-6 py-16 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            🔨 Подряд PRO
          </h1>
          <p className="text-lg opacity-90">
            Работа и подработка в Омске
          </p>
          <p className="text-sm opacity-70">
            Грузчики · Уборка · Строительство · Любые задачи
          </p>

          <div className="flex flex-col gap-3 mt-8">
            <a
              href={`https://t.me/${botName}`}
              className="bg-white text-[#0088cc] font-bold py-3 px-6 rounded-2xl text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              📱 Открыть бот в Telegram
            </a>
            <Link
              href="/app/map"
              className="bg-white/20 backdrop-blur text-white font-medium py-3 px-6 rounded-2xl text-lg border border-white/30 hover:bg-white/30 transition-colors"
            >
              🗺 Смотреть заказы на карте
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-12 max-w-md mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-center">Как это работает</h2>

        <div className="space-y-6">
          {[
            {
              icon: '📝',
              title: 'Заказчик пишет боту',
              desc: 'Опишите задачу — платформа рассчитает стоимость по тарифам. Оплата через ЮKassa.',
            },
            {
              icon: '📢',
              title: 'Заказ публикуется в канале',
              desc: 'С точкой на карте, кнопкой навигации и всеми деталями',
            },
            {
              icon: '🏃',
              title: 'Исполнитель откликается',
              desc: 'Первый подходящий получает заказ. Общение через бота — контакты скрыты до завершения.',
            },
            {
              icon: '⭐',
              title: 'Рейтинг и доверие',
              desc: 'После выполнения — оценка. Лучшие получают больше заказов',
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-50 rounded-xl">
                {step.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Calculator + Tariffs */}
      <section className="bg-gray-100 px-6 py-12">
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-center">Сколько стоит?</h2>
          <CostCalculator />

          <h2 className="text-2xl font-bold text-center pt-6">Дополнительные услуги</h2>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-5 shadow-sm border border-amber-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">🌟 VIP подписка</h3>
                  <p className="text-gray-500 text-sm">Ранний доступ к заказам</p>
                </div>
                <span className="text-2xl font-extrabold text-amber-600">1000₽<span className="text-sm font-normal">/мес</span></span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">🏆 Подбор ТОП-3</h3>
                  <p className="text-gray-500 text-sm">Персональная подборка</p>
                </div>
                <span className="text-2xl font-extrabold text-[#0088cc]">1000₽</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 text-center max-w-md mx-auto">
        <a
          href={`https://t.me/${botName}`}
          className="block bg-[#0088cc] text-white font-bold py-4 px-8 rounded-2xl text-lg hover:bg-[#0077b3] transition-colors shadow-lg"
        >
          Начать в Telegram →
        </a>
        <p className="text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} Подряд PRO · podryad.pro
        </p>
      </section>
    </main>
  );
}
