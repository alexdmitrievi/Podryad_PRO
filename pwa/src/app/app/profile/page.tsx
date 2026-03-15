export default function ProfilePage() {
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

  return (
    <div className="h-full overflow-y-auto">
      <header className="bg-[#0088cc] text-white px-4 py-3">
        <h1 className="text-lg font-bold">👤 Профиль</h1>
        <p className="text-xs opacity-80">Управление аккаунтом</p>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Auth prompt */}
        <div className="bg-white rounded-2xl p-6 text-center space-y-4 shadow-sm border border-gray-100">
          <div className="text-5xl">🔐</div>
          <h2 className="font-bold text-xl">Войдите через Telegram</h2>
          <p className="text-gray-500 text-sm">
            Ваш профиль, рейтинг и история заказов — всё в Telegram-боте
          </p>
          <a
            href={`https://t.me/${botName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#0088cc] text-white font-medium
                       px-6 py-3 rounded-xl hover:bg-[#0077b3] transition-colors"
          >
            📱 Открыть @{botName}
          </a>
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm mb-2">🌟 VIP подписка</h3>
            <p className="text-gray-500 text-xs mb-3">
              Ранний доступ к заказам, приоритет при отклике, VIP-бейдж
            </p>
            <a
              href={`https://t.me/${botName}?start=vip`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0088cc] text-sm font-medium"
            >
              Подключить за 1000₽/мес →
            </a>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm mb-2">🏆 Подбор исполнителей</h3>
            <p className="text-gray-500 text-xs mb-3">
              Получите персональную подборку ТОП-3 проверенных исполнителей
            </p>
            <a
              href={`https://t.me/${botName}?start=pick`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0088cc] text-sm font-medium"
            >
              Заказать подбор за 1000₽ →
            </a>
          </div>
        </div>

        <p className="text-gray-300 text-xs text-center pt-4">
          © {new Date().getFullYear()} Подряд PRO · podryad.pro
        </p>
      </div>
    </div>
  );
}
