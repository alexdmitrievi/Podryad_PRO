'use client';

import OrderForm from '@/components/OrderForm';
import BottomNav from '@/components/BottomNav';

export default function OrderPage() {
  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-brand-blue text-white p-4 shrink-0">
        <h1 className="text-xl font-bold">📝 Новый заказ</h1>
        <p className="text-sm opacity-80">Заполните форму или напишите боту</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="max-w-lg mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              💡 <strong>Совет:</strong> Проще всего создать заказ через{' '}
              <a
                href="https://t.me/Podryad_PRO_bot"
                className="underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram-бота
              </a>{' '}
              — просто опишите задачу текстом, AI всё разберёт.
            </p>
          </div>

          <OrderForm />
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
