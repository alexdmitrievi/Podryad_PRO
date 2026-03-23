'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Inbox } from 'lucide-react';
import OrderCard from '@/components/OrderCard';
import PageHeader from '@/components/PageHeader';
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
    <div className="flex flex-col h-full bg-white dark:bg-dark-bg">
      <PageHeader
        title="🔨 Подряд PRO"
        subtitle={loading ? 'Загрузка...' : `${published.length} заказов`}
      />

      {/* Map */}
      <div className="h-56 w-full flex-shrink-0 relative">
        {!loading && <MapView orders={published} />}
        {loading && (
          <div className="h-full w-full bg-gray-100 dark:bg-dark-card flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
            <span className="text-gray-400 text-xs">Загрузка карты...</span>
          </div>
        )}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3 pb-2">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-44 w-full" />
              ))}
            </>
          ) : published.length === 0 ? (
            <div className="text-center py-16 space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                <Inbox size={28} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-500 dark:text-dark-muted text-lg">Пока нет заказов</p>
              <p className="text-sm text-gray-400">Новые появятся совсем скоро!</p>
            </div>
          ) : (
            published.map((order) => (
              <OrderCard key={order.order_id} order={order} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
