'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import OrderCard from '@/components/OrderCard';
import type { Order } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function MapPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const published = orders.filter((o) => o.status === 'published');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-[#0088cc] text-white px-4 py-3 flex-shrink-0">
        <h1 className="text-lg font-bold">🔨 Подряд PRO</h1>
        <p className="text-xs opacity-80">
          {loading ? 'Загрузка...' : `${published.length} активных заказов`}
        </p>
      </header>

      {/* Map */}
      <div className="h-56 w-full flex-shrink-0">
        {!loading && <MapView orders={published} />}
        {loading && (
          <div className="h-full w-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">🗺 Загрузка карты...</span>
          </div>
        )}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-48 w-full" />
            ))}
          </>
        ) : published.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">Пока нет активных заказов</p>
            <p className="text-sm mt-1">Новые появятся совсем скоро!</p>
          </div>
        ) : (
          published.map((order) => (
            <OrderCard key={order.order_id} order={order} />
          ))
        )}
      </div>
    </div>
  );
}
