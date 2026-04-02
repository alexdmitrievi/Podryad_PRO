import Link from 'next/link';

const tgBot = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';
const telegramUrl = `https://t.me/${tgBot}`;

// Static hardcoded prices (not from DB)
const PRICES = {
  workerPerHour: 650,
  crewPerShift: 18500,
  equipmentDaily: 3200,
  concreteM3: 5800,
};

const FEATURES = [
  {
    icon: '★',
    title: 'Проверенные исполнители',
    desc: 'Самозанятые и бригады с рейтингом и отзывами. Все проверено',
  },
  {
    icon: '⚡',
    title: 'Отклик за 15 минут',
    desc: 'Исполнители на связи круглосуточно, 7 дней в неделю',
  },
  {
    icon: '🔒',
    title: 'Безопасная оплата',
    desc: 'Деньги заморожены до подтверждения работы. Картой или СБП',
  },
  {
    icon: '🏗',
    title: 'Техника и материалы',
    desc: 'Самосвалы, краны, бетон — комплектуем объект под ключ',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Оставьте заявку',
    desc: 'Укажите адрес, вид работ, количество людей и нужную технику',
  },
  {
    n: '2',
    title: 'Выберите исполнителя',
    desc: 'Получите предложения в течение 15 минут и выберите лучшее',
  },
  {
    n: '3',
    title: 'Оплатите безопасно',
    desc: 'Картой, СБП или по реквизитам — деньги заморожены до завершения',
  },
  {
    n: '4',
    title: 'Примите работу',
    desc: 'Подтвердите результат — выплата исполнителю проходит автоматически',
  },
];

export default function HomePage() {
  return (
    <main
      style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}
      className="min-h-screen flex flex-col bg-white"
    >

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#2d35a8]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white font-extrabold text-lg tracking-tight select-none"
          >
            <span className="text-[#f5a623]" aria-hidden="true">★</span>
            <span>Подряд PRO</span>
          </Link>
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center bg-[#f5a623] hover:bg-[#e09510] active:scale-95 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
          >
            Оставить заявку
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-[#2d35a8] text-white overflow-hidden pt-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 50%, #f5a623 0%, transparent 55%), radial-gradient(circle at 85% 15%, #ffffff 0%, transparent 45%)',
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            Принимаем заказы · Омск и Новосибирск
          </span>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
            Одна заявка —{' '}
            <br />
            <span style={{ color: '#f5a623' }}>вся команда</span> на объекте
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-md mx-auto leading-relaxed">
            Рабочие, бригады, техника, материалы. Безопасная оплата. Омск и Новосибирск.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#lead-form"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#f5a623] hover:bg-[#e09510] active:scale-95 text-white font-bold py-4 px-9 rounded-2xl text-base shadow-lg transition-all duration-200 cursor-pointer"
            >
              Оставить заявку
              <span aria-hidden="true">→</span>
            </a>
            <Link
              href="/catalog"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-2xl text-base border border-white/20 transition-all duration-200 cursor-pointer"
            >
              Каталог услуг
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { val: '100+', label: 'исполнителей' },
              { val: '4.9', label: 'рейтинг' },
              { val: '15 мин', label: 'отклик' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold tabular-nums">{s.val}</p>
                <p className="text-xs text-white/55 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10">
            Комплексное решение — не просто кадры
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: '#2d35a8', color: '#f5a623' }}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10">
            Четыре шага к результату
          </h2>
          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <div key={step.n} className="flex gap-4 items-start">
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-sm mt-0.5"
                  style={{ background: i === STEPS.length - 1 ? '#f5a623' : '#2d35a8' }}
                >
                  {step.n}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="bg-[#2d35a8] py-16 md:py-24 text-white">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-2">
            Прозрачные цены
          </h2>
          <p className="text-center text-white/60 text-sm mb-10">
            Без скрытых комиссий — цена фиксируется при оформлении заказа
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Разнорабочие', price: `от ${PRICES.workerPerHour} ₽/ч` },
              { label: 'Бригады', price: `от ${PRICES.crewPerShift.toLocaleString('ru')} ₽/смена` },
              { label: 'Спецтехника', price: `от ${PRICES.equipmentDaily.toLocaleString('ru')} ₽/сут` },
              { label: 'Бетон', price: `от ${PRICES.concreteM3.toLocaleString('ru')} ₽/м³` },
            ].map((cat) => (
              <div
                key={cat.label}
                className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <p className="font-bold text-sm text-white/90 mb-2">{cat.label}</p>
                <p className="text-lg font-extrabold" style={{ color: '#f5a623' }}>{cat.price}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-xs text-white/40">
            Скидка 15% при заказе исполнителей + техники в одном заказе
          </p>
        </div>
      </section>

      {/* ── SAFE DEAL ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full mb-6"
            style={{ background: '#eef0fa', color: '#2d35a8' }}
          >
            <span aria-hidden="true">🔒</span>
            <span>Безопасная сделка</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
            Деньги защищены до приёмки
          </h2>
          <p className="text-gray-500 leading-relaxed mb-8">
            Оплата замораживается при старте работ. Исполнитель получает деньги только после
            вашего подтверждения. Возник спор — подключается арбитраж. Никаких рисков авансов.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '💳', label: 'Оплата картой и СБП' },
              { icon: '🔐', label: 'Эскроу до завершения' },
              { icon: '⚖️', label: 'Арбитраж споров' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: '#f8f9ff' }}>
                <div className="text-2xl mb-2" aria-hidden="true">{item.icon}</div>
                <p className="text-xs font-semibold text-gray-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR EXECUTORS ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-5">
          <div className="rounded-3xl p-8 md:p-10" style={{ background: '#2d35a8' }}>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: '#f5a623' }}
            >
              Исполнителям
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
              Бесплатно для самозанятых
            </h2>
            <p className="text-white/70 leading-relaxed mb-6">
              Платформа бесплатна для исполнителей навсегда. Без подписок и скрытых комиссий.
              Получайте заказы в приоритете, если оформлены как самозанятый.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                'Регистрация за 5 минут',
                'Заказы без посредников',
                'Выплата в день завершения',
                'Приоритет для самозанятых',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/85">
                  <span style={{ color: '#f5a623' }} aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center font-bold py-3 px-7 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
                style={{ background: '#f5a623', color: '#fff' }}
              >
                Стать исполнителем
              </Link>
              <Link
                href="/selfemployed"
                className="inline-flex items-center justify-center font-semibold py-3 px-7 rounded-xl text-white/80 hover:text-white transition-colors duration-200 border border-white/20 cursor-pointer"
              >
                Подробнее →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── LEAD FORM STUB ── */}
      <section id="lead-form" className="bg-white py-16 md:py-24 scroll-mt-14">
        <div className="max-w-lg mx-auto px-5">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Оставить заявку
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              Омск и Новосибирск · Ответим в течение 15 минут
            </p>
          </div>

          <div
            className="rounded-3xl p-8 border-2 border-dashed text-center"
            style={{ borderColor: '#2d35a8', background: '#f8f9ff' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: '#2d35a8', color: '#f5a623' }}
              aria-hidden="true"
            >
              📋
            </div>
            <p className="font-bold text-gray-800 text-lg mb-1">Форма заявки — скоро</p>
            <p className="text-sm text-gray-500 mb-6">
              Пока вы можете написать нам напрямую через мессенджер
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-bold py-3 px-7 rounded-xl text-white transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95"
                style={{ background: '#2AABEE' }}
              >
                <span aria-hidden="true">✈</span>
                Telegram
              </a>
              <a
                href={maxChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-bold py-3 px-7 rounded-xl text-white transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95"
                style={{ background: '#2787F5' }}
              >
                MAX
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d1033] py-14">
        <div className="max-w-4xl mx-auto px-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-white font-extrabold text-lg">
                <span style={{ color: '#f5a623' }}>★</span> Подряд PRO
              </p>
              <p className="text-gray-500 text-sm mt-1">Рабочие и техника под ключ</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Telegram
              </a>
              <span className="text-gray-700" aria-hidden="true">·</span>
              <a
                href={maxChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                MAX
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-white mb-3">Заказчикам</p>
              <Link
                href="/catalog"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Каталог услуг
              </Link>
              <Link
                href="/equipment"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Аренда техники
              </Link>
              <Link
                href="/marketplace"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Маркетплейс
              </Link>
            </div>
            <div>
              <p className="font-semibold text-white mb-3">Исполнителям</p>
              <Link
                href="/auth/register"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Зарегистрироваться
              </Link>
              <Link
                href="/selfemployed"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Самозанятым
              </Link>
              <Link
                href="/dashboard"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Личный кабинет
              </Link>
            </div>
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
              <Link
                href="/privacy"
                className="block text-gray-400 hover:text-white transition-colors py-1"
              >
                Политика конф.
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6 text-center">
            <p className="text-gray-500 text-xs">
              &copy; {new Date().getFullYear()} Подряд PRO &middot; podryad.pro
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}