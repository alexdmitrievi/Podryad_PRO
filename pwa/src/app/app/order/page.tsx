import OrderForm from '@/components/OrderForm';

export default function OrderPage() {
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

  return (
    <div className="h-full overflow-y-auto">
      <header className="bg-[#0088cc] text-white px-4 py-3">
        <h1 className="text-lg font-bold">➕ Новый заказ</h1>
        <p className="text-xs opacity-80">Заполните форму или напишите боту</p>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Quick bot link */}
        <a
          href={`https://t.me/${botName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-blue-50 border border-blue-200
                     rounded-xl p-3 hover:bg-blue-100 transition-colors"
        >
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-medium text-sm text-[#0088cc]">Быстрее через Telegram</p>
            <p className="text-xs text-gray-500">
              Просто напишите боту — ИИ всё распознает
            </p>
          </div>
        </a>

        <div className="flex items-center gap-3 text-gray-300">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs">или заполните форму</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <OrderForm />
      </div>
    </div>
  );
}
