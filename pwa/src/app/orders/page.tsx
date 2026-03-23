'use client';

import { useEffect, useState } from 'react';
import {
  MapPin, Inbox, ExternalLink,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { SkeletonOrderCard } from '@/components/ui/Skeleton';
import type { Order } from '@/lib/types';

const statusLabel: Record<string, string> = {
  pending: 'Ожидает оплаты',
  published: 'Активен',
  closed: 'Закрыт',
  cancelled: 'Отменён',
  paid: 'Оплачен',
  done: 'Выполнен',
};

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  paid:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  closed:    { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500' },
  done:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pt-16">
      <PageHeader title="📋 Заказы" />

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonOrderCard key={i} />
            ))}
          </>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-bold text-lg text-gray-800 dark:text-gray-100">Нет активных заказов</p>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-2 mb-6">
              Новые заказы появятся совсем скоро!
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot'}?start=order`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-500 text-white font-medium py-2.5 px-6 rounded-xl
                           text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
              >
                📱 Создать заказ в боте
              </a>
              <a
                href="/dashboard"
                className="bg-gray-100 text-gray-700 font-medium py-2.5 px-6 rounded-xl
                           text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                📋 Доска заказов
              </a>
            </div>
          </div>
        ) : (
          orders.map((order, i) => {
            const s = statusStyle[order.status] || statusStyle.pending;
            return (
              <div
                key={order.order_id}
                className="
                  bg-white dark:bg-dark-card rounded-3xl p-5 shadow-card border border-gray-100 dark:border-dark-border
                  hover:shadow-card-hover transition-all duration-300
                  animate-fade-in
                "
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-900 dark:text-white">#{order.order_id}</span>
                  <span className={`
                    inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold
                    ${s.bg} ${s.text}
                  `}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {statusLabel[order.status] ?? order.status}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200 mb-2">
                  <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="font-medium">{order.address}</span>
                </div>

                <p className="text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  📋 {order.work_type}
                  {order.worker_payout != null
                    ? <span className="font-semibold text-emerald-600"> · {order.worker_payout.toLocaleString('ru-RU')}₽ на руки</span>
                    : order.payment_text && <span> · {order.payment_text}</span>}
                  {order.people && <span> · {order.people} чел.</span>}
                </p>

                {order.yandex_link && (
                  <a
                    href={order.yandex_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      inline-flex items-center gap-1.5 mt-3 text-brand-500
                      text-xs font-semibold hover:text-brand-700 transition-colors
                    "
                  >
                    <ExternalLink size={12} />
                    Открыть на карте
                  </a>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
