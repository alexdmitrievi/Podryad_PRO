'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import BottomNav from '@/components/BottomNav';

function PaymentContent() {
  const params = useSearchParams();
  const type = params.get('type') || 'order';
  const amount = params.get('amount') || '500';
  const userId = params.get('user_id') || '';

  const typeLabels: Record<string, string> = {
    order: 'Публикация заказа',
    vip: 'VIP подписка (1 мес)',
    pick: 'Подбор топ-3 исполнителей',
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-brand-blue text-white p-4 shrink-0">
        <h1 className="text-xl font-bold">💳 Оплата</h1>
        <p className="text-sm opacity-80">{typeLabels[type] || 'Оплата услуги'}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
            <p className="text-gray-500 text-sm mb-2">{typeLabels[type]}</p>
            <p className="text-4xl font-extrabold text-brand-blue mb-1">
              {parseInt(amount).toLocaleString('ru-RU')}
              <span className="text-lg font-normal text-gray-400"> ₽</span>
            </p>
            {userId && (
              <p className="text-xs text-gray-400 mt-2">ID: {userId}</p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-sm text-yellow-800">
              🚧 <strong>Тестовый режим.</strong> Интеграция с ЮKassa будет
              подключена после получения боевых ключей. Сейчас для тестирования
              используйте команду <code>/approve_ID</code> в боте (от админа).
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 space-y-4">
            <h3 className="font-bold text-lg">Способы оплаты</h3>

            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed"
            >
              💳 Банковская карта (скоро)
            </button>
            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed"
            >
              📱 СБП (скоро)
            </button>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500 mb-3">
                Пока оплата через бота:
              </p>
              <a
                href="https://t.me/Podryad_PRO_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-brand-blue text-white py-3 rounded-xl font-bold hover:bg-brand-blue-dark transition-colors"
              >
                🤖 Оплатить через бота
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h3 className="font-bold mb-3">Что вы получаете</h3>
            {type === 'order' && (
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Публикация заказа в канале</li>
                <li>✅ Геоточка на карте</li>
                <li>✅ Уведомления об откликах</li>
                <li>✅ Контакты исполнителя</li>
              </ul>
            )}
            {type === 'vip' && (
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Ранний доступ к заказам (30 мин)</li>
                <li>✅ Приоритет при отклике</li>
                <li>✅ Значок VIP в профиле</li>
                <li>✅ Поддержка 24/7</li>
              </ul>
            )}
            {type === 'pick' && (
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ AI-подбор топ-3 исполнителей</li>
                <li>✅ Рейтинг и характеристики</li>
                <li>✅ Прямые контакты</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Загрузка...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
