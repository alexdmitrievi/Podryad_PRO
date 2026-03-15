'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    pending: 'Ожидает оплаты',
    published: 'Активен',
    closed: 'Закрыт',
    cancelled: 'Отменён',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0088cc] text-white px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-bold">📋 Заказы</h1>
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">
            ← Главная
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-32" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="font-medium text-lg">Нет активных заказов</p>
            <p className="text-sm mt-2">Новые заказы появятся совсем скоро!</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.order_id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-gray-800">#{order.order_id}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {statusLabel[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-medium">📍</span> {order.address}
              </p>
              <p className="text-sm text-gray-500">
                📋 {order.work_type}
                {order.payment && ` · 💰 ${order.payment}`}
                {order.people && ` · 👥 ${order.people} чел.`}
              </p>
              {order.yandex_link && (
                <a
                  href={order.yandex_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0088cc] text-xs mt-2 inline-block hover:underline"
                >
                  🗺 Открыть на карте
                </a>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
