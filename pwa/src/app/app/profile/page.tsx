import Link from 'next/link';
import NotificationSettings from '@/components/NotificationSettings';
import PageHeader from '@/components/PageHeader';

const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

export default function ProfilePage() {
  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="👤 Личный кабинет" backHref="/" />

      <div className="p-4 space-y-6 max-w-md mx-auto pb-8">

        {/* ══ Выберите ваш кабинет ══ */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 px-1">Выберите ваш кабинет</h2>

          <Link
            href="/customer"
            className="flex items-center gap-4 bg-white rounded-3xl p-5 shadow-card border border-gray-100 transition-all hover:shadow-card-hover active:scale-[0.98]"
          >
            <span className="text-3xl flex-shrink-0">🧾</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900">Кабинет заказчика</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Оформление заказов, оплата, статус выполнения
              </p>
            </div>
            <span className="text-gray-300 text-lg flex-shrink-0">→</span>
          </Link>

          <Link
            href="/worker"
            className="flex items-center gap-4 bg-white rounded-3xl p-5 shadow-card border border-gray-100 transition-all hover:shadow-card-hover active:scale-[0.98]"
          >
            <span className="text-3xl flex-shrink-0">💼</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900">Кабинет исполнителя</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Заказы, заработок, рейтинг, выплаты
              </p>
            </div>
            <span className="text-gray-300 text-lg flex-shrink-0">→</span>
          </Link>
        </section>

        <NotificationSettings pushRole="customer" />

        {/* ══ Быстрые ссылки ══ */}
        <section className="space-y-2">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide px-1 mb-1">
            Быстрые ссылки
          </h3>

          {[
            { emoji: '📋', label: 'Доска заказов', href: '/dashboard' },
            { emoji: '🗺', label: 'Заказы на карте', href: '/app/map' },
            { emoji: '🔧', label: 'Аренда техники', href: '/equipment' },
            { emoji: '💳', label: 'Тарифы', href: '/app/payments' },
            { emoji: '📋', label: 'Как стать самозанятым', href: '/selfemployed' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-card border border-gray-100 transition-all hover:shadow-card-hover active:scale-[0.98]"
            >
              <span className="text-lg">{link.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
              <span className="ml-auto text-gray-300 text-sm">→</span>
            </Link>
          ))}
        </section>

        {/* ══ Авторизация ══ */}
        <section className="text-center space-y-3 pt-2">
          <p className="text-xs text-gray-400 leading-relaxed px-2">
            Полный личный кабинет с историей заказов, рейтингом и выплатами
            доступен в боте @{botName}
          </p>
          <a
            href={`https://t.me/${botName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 rounded-xl font-semibold text-sm bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-[0.98] shadow-sm shadow-brand-500/20"
          >
            Открыть бот
          </a>
          <p className="text-xs text-gray-400">
            Telegram недоступен?{' '}
            <a
              href={maxChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 font-medium hover:underline"
            >
              MAX →
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
