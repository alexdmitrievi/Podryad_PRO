import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-brand-blue text-white p-4 shrink-0">
        <h1 className="text-xl font-bold">👤 Профиль</h1>
        <p className="text-sm opacity-80">Рейтинг и история заказов</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
            <div className="text-5xl mb-3">👷</div>
            <h2 className="text-xl font-bold mb-1">Войдите через Telegram</h2>
            <p className="text-gray-500 text-sm mb-4">
              Для просмотра профиля и истории заказов авторизуйтесь через бота
            </p>
            <a
              href="https://t.me/Podryad_PRO_bot?start=profile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-blue text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-blue-dark transition-colors"
            >
              🤖 Открыть бота
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h3 className="font-bold text-lg mb-4">Возможности профиля</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="font-medium">Рейтинг</p>
                  <p className="text-sm text-gray-500">Ваша оценка на основе отзывов заказчиков</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-medium">Статистика</p>
                  <p className="text-sm text-gray-500">Количество выполненных заказов</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🌟</span>
                <div>
                  <p className="font-medium">VIP статус</p>
                  <p className="text-sm text-gray-500">Ранний доступ к заказам за 1000р/мес</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📋</span>
                <div>
                  <p className="font-medium">История</p>
                  <p className="text-sm text-gray-500">Все ваши заказы и отклики</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
