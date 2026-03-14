import Link from 'next/link';

const FEATURES = [
  {
    icon: '📝',
    title: 'Опишите задачу',
    desc: 'Напишите боту что нужно сделать — AI разберёт заявку автоматически',
  },
  {
    icon: '📍',
    title: 'Геолокация',
    desc: 'Адрес на карте + маршрут в Яндекс.Навигаторе одной кнопкой',
  },
  {
    icon: '👷',
    title: 'Быстрый отклик',
    desc: 'Исполнители видят заказ в канале и берут его за секунды',
  },
  {
    icon: '⭐',
    title: 'Рейтинг и отзывы',
    desc: 'Система оценок гарантирует качество — только проверенные люди',
  },
];

const PRICES = [
  { label: 'Публикация заказа', price: '500', unit: 'за заказ' },
  { label: 'VIP подписка', price: '1 000', unit: 'руб/мес' },
  { label: 'Подбор топ-3', price: '1 000', unit: 'разово' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-blue text-white">
        <nav className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔨</span>
            <span className="text-xl font-bold">Подряд PRO</span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/app/map"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Открыть карту
            </Link>
            <a
              href="https://t.me/Podryad_PRO_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-brand-blue px-4 py-2 rounded-lg text-sm font-bold transition-colors hover:bg-gray-100"
            >
              Telegram бот
            </a>
          </div>
        </nav>

        <section className="max-w-5xl mx-auto px-4 pt-12 pb-20 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Работа и подработка
            <br />
            <span className="text-yellow-300">в Омске</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Найдите грузчиков, строителей, уборщиков за&nbsp;минуты.
            Telegram&#8209;бот с&nbsp;AI&#8209;парсингом заявок и&nbsp;картой заказов.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://t.me/Podryad_PRO_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-blue px-8 py-3 rounded-xl text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
            >
              <span>🤖</span> Открыть бота
            </a>
            <Link
              href="/app/map"
              className="inline-flex items-center justify-center gap-2 bg-brand-blue border-2 border-white px-8 py-3 rounded-xl text-lg font-bold hover:bg-brand-blue-dark transition-colors"
            >
              <span>🗺</span> Карта заказов
            </Link>
          </div>
        </section>
      </header>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Как это работает</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Тарифы</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {PRICES.map((p, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-md p-6 text-center border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <p className="text-gray-600 text-sm mb-2">{p.label}</p>
                <p className="text-3xl font-extrabold text-brand-blue mb-1">
                  {p.price}<span className="text-base font-normal text-gray-400"> ₽</span>
                </p>
                <p className="text-xs text-gray-400">{p.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-brand-blue text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Готовы начать?</h2>
          <p className="text-lg opacity-90 mb-8">
            Откройте бота в Telegram и опишите задачу. Всё остальное мы сделаем за вас.
          </p>
          <a
            href="https://t.me/Podryad_PRO_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-brand-blue px-8 py-3 rounded-xl text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
          >
            🤖 Написать боту
          </a>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🔨</span>
            <span className="font-bold text-white">Подряд PRO</span>
            <span className="text-sm">| Работа Омск</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="https://t.me/Podryad_PRO_bot" className="hover:text-white transition-colors">
              Telegram
            </a>
            <Link href="/app/map" className="hover:text-white transition-colors">
              Карта
            </Link>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} podryad.pro</p>
        </div>
      </footer>
    </div>
  );
}
