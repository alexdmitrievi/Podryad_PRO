'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import OrderCard from '@/components/OrderCard';
import BottomNav from '@/components/BottomNav';
import type { Order } from '@/lib/sheets';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Загрузка карты...</span>
    </div>
  ),
});

export default function MapPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/orders', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-brand-blue text-white p-4 shrink-0">
        <h1 className="text-xl font-bold">🔨 Подряд PRO | Работа Омск</h1>
        <p className="text-sm opacity-80">
          {loading ? 'Загрузка...' : `${orders.length} активных заказов`}
        </p>
      </header>

      <div className="h-64 w-full shrink-0">
        <MapView orders={orders} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            Загрузка заказов...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            Пока нет активных заказов
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.order_id} order={order} />
          ))
        )}
      </div>

      <BottomNav />
    </main>
  );
}
