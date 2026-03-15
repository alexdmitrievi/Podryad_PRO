export default function PaymentsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <header className="bg-[#0088cc] text-white px-4 py-3">
        <h1 className="text-lg font-bold">💳 Оплата</h1>
        <p className="text-xs opacity-80">ЮKassa — безопасные платежи</p>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-6 text-center space-y-4 shadow-sm border border-gray-100">
          <div className="text-5xl">🔧</div>
          <h2 className="font-bold text-lg">Платёжная система</h2>
          <p className="text-gray-500 text-sm">
            Оплата подключается через ЮKassa. На данный момент оплата
            производится через Telegram-бот.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-medium">Тарифы:</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">📝 Заказ (грузчики, уборка…)</span>
              <span className="font-semibold">от 600₽/час</span>
            </div>
            <p className="text-xs text-gray-500">Стоимость зависит от типа работ, людей и часов</p>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">🌟 VIP подписка</span>
              <span className="font-semibold">1 000₽/мес</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">🏆 Подбор ТОП-3</span>
              <span className="font-semibold">1 000₽</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
