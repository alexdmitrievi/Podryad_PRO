'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ShoppingBag } from 'lucide-react';

interface CustomerOrder {
  order_id: string;
  order_number?: string;
  created_at: string;
  status: string;
  customer_total?: number;
  work_type: string;
  escrow_status?: string;
  scheduled_date?: string;
}

type StatusFilter = 'all' | 'active' | 'completed';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Ожидает оплаты', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
  payment_held:    { label: 'Оплачен', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  in_progress:     { label: 'Выполняется', color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' },
  pending_confirm: { label: 'Ожидает подтверждения', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  completed:       { label: 'Завершён', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  disputed:        { label: 'Спор', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  cancelled:       { label: 'Отменён', color: 'text-gray-500 bg-gray-50 dark:bg-dark-bg' },
};

const ACTIVE_STATUSES = new Set(['pending_payment', 'payment_held', 'in_progress', 'pending_confirm']);
const COMPLETED_STATUSES = new Set(['completed', 'cancelled', 'disputed']);

export default function CustomerDashboardPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetch('/api/orders/my')
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : (data.orders ?? []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const st = o.escrow_status || o.status;
    if (filter === 'active') return ACTIVE_STATUSES.has(st);
    if (filter === 'completed') return COMPLETED_STATUSES.has(st);
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">Мои заказы</h1>
            <Link
              href="/catalog"
              className="text-sm font-medium text-brand-500 hover:underline cursor-pointer"
            >
              + Новый заказ
            </Link>
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {([
              { value: 'all' as const, label: 'Все' },
              { value: 'active' as const, label: 'Активные' },
              { value: 'completed' as const, label: 'Завершённые' },
            ]).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === f.value
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 animate-pulse">
                <div className="h-4 bg-gray-100 dark:bg-dark-border rounded-full w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-dark-border rounded-full w-2/3 mb-3" />
                <div className="h-8 bg-gray-100 dark:bg-dark-border rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-gray-300 dark:text-dark-border" />
            </div>
            <p className="text-gray-500 dark:text-dark-muted font-medium">Заказов нет</p>
            <Link
              href="/catalog"
              className="mt-3 px-6 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const st = order.escrow_status || order.status;
              const badge = STATUS_LABELS[st] ?? { label: st, color: 'text-gray-500 bg-gray-50' };
              const date = new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

              return (
                <Link
                  key={order.order_id}
                  href={`/order/${order.order_id}/status`}
                  className="flex items-center justify-between bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {order.order_number || `#${order.order_id.slice(-6)}`}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-muted line-clamp-1">{order.work_type}</p>
                    <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">{date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {order.customer_total != null && (
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {order.customer_total.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-300 dark:text-dark-border" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
