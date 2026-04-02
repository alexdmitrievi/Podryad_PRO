'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ToggleLeft, ToggleRight, Star, CreditCard, ChevronRight } from 'lucide-react';

interface SupplierOrder {
  order_id: string;
  order_number?: string;
  created_at: string;
  status: string;
  escrow_status?: string;
  supplier_payout?: number;
  work_type: string;
  scheduled_date?: string;
}

interface SupplierListing {
  listing_id: string;
  title: string;
  base_price?: number;   // supplier sees base_price (their rate)
  price?: number;        // fallback
  price_unit: string;
  category_slug?: string;
  is_active: boolean;
  orders_count?: number;
  rating?: number;
}

const ORDER_STATUS: Record<string, string> = {
  pending_payment: 'Ожидает оплаты',
  payment_held: 'Оплачен',
  in_progress: 'Выполняется',
  pending_confirm: 'Ожидает подтверждения',
  completed: 'Завершён',
  cancelled: 'Отменён',
  disputed: 'Спор',
};

type Tab = 'orders' | 'listings' | 'profile';

export default function SupplierDashboardPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [listings, setListings] = useState<SupplierListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ordersRes, listingsRes] = await Promise.all([
          fetch('/api/orders/my'),
          fetch('/api/marketplace/my'),
        ]);
        const [ordersData, listingsData] = await Promise.all([
          ordersRes.json(),
          listingsRes.json(),
        ]);
        setOrders(Array.isArray(ordersData) ? ordersData : (ordersData.orders ?? []));
        setListings(Array.isArray(listingsData) ? listingsData : (listingsData.listings ?? []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const totalPayout = orders
    .filter((o) => (o.escrow_status || o.status) === 'completed')
    .reduce((sum, o) => sum + (o.supplier_payout ?? 0), 0);

  const activeOrders = orders.filter((o) => {
    const st = o.escrow_status || o.status;
    return ['payment_held', 'in_progress', 'pending_confirm'].includes(st);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Кабинет поставщика</h1>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-2">
              <div className="font-bold text-gray-900 dark:text-white text-sm">{activeOrders.length}</div>
              <div className="text-[10px] text-gray-400 dark:text-dark-muted">активных</div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-2">
              <div className="font-bold text-gray-900 dark:text-white text-sm">{listings.filter((l) => l.is_active).length}</div>
              <div className="text-[10px] text-gray-400 dark:text-dark-muted">объявлений</div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-2">
              <div className="font-bold text-brand-500 text-sm">{totalPayout.toLocaleString('ru-RU')} ₽</div>
              <div className="text-[10px] text-gray-400 dark:text-dark-muted">выплачено</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg rounded-xl p-1">
            {([
              { value: 'orders' as const, label: 'Заказы' },
              { value: 'listings' as const, label: 'Мои объявления' },
              { value: 'profile' as const, label: 'Профиль' },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === t.value
                    ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-dark-muted'
                }`}
              >
                {t.label}
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
                <div className="h-4 bg-gray-100 dark:bg-dark-border rounded-full w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-dark-border rounded-full w-2/3" />
              </div>
            ))}
          </div>
        ) : tab === 'orders' ? (
          <OrdersTab orders={orders} />
        ) : tab === 'listings' ? (
          <ListingsTab listings={listings} />
        ) : (
          <ProfileTab />
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: SupplierOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Package size={32} className="text-gray-300 mb-3" />
        <p className="text-gray-500 dark:text-dark-muted font-medium">Заказов пока нет</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const st = order.escrow_status || order.status;
        const date = new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        return (
          <Link
            key={order.order_id}
            href={`/order/${order.order_id}/status`}
            className="flex items-center justify-between bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 hover:shadow-sm transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {order.order_number || `#${order.order_id.slice(-6)}`}
                </span>
                <span className="text-[11px] text-gray-400">{date}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-muted line-clamp-1">{order.work_type}</p>
              <p className="text-xs mt-0.5 text-brand-500">{ORDER_STATUS[st] ?? st}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {order.supplier_payout != null && (
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {order.supplier_payout.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-[10px] text-gray-400">к получению</div>
                </div>
              )}
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ListingsTab({ listings }: { listings: SupplierListing[] }) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Package size={32} className="text-gray-300 mb-3" />
        <p className="text-gray-500 dark:text-dark-muted font-medium">Объявлений нет</p>
        <Link
          href="/supplier"
          className="mt-3 px-6 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl"
        >
          Добавить объявление
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const myRate = listing.base_price ?? listing.price ?? 0;
        return (
          <div
            key={listing.listing_id}
            className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                  {listing.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {myRate.toLocaleString('ru-RU')} ₽/{listing.price_unit}
                  </span>
                  <span className="text-[11px] text-gray-400">моя ставка</span>
                  {listing.rating != null && listing.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Star size={11} className="text-yellow-400 fill-yellow-400" />
                      {listing.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className={`shrink-0 flex items-center gap-1 text-xs font-medium ${
                listing.is_active ? 'text-green-600' : 'text-gray-400'
              }`}>
                {listing.is_active
                  ? <ToggleRight size={18} className="text-green-500" />
                  : <ToggleLeft size={18} />}
                {listing.is_active ? 'Активно' : 'Неактивно'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <CreditCard size={16} className="text-brand-500" />
          Карта для выплат
        </h3>
        <Link
          href="/worker/profile"
          className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 cursor-pointer"
        >
          <span>Управлять картой</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Мои объявления</h3>
        <Link
          href="/supplier"
          className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 cursor-pointer"
        >
          <span>Редактировать профиль поставщика</span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
