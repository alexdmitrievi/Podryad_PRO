'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { PublicOrder } from '@/components/OrdersMap';

const OrdersMap = dynamic(() => import('@/components/OrdersMap'), { ssr: false });

const CITY_OPTIONS = [
  { key: 'omsk', label: 'Омск' },
  { key: 'novosibirsk', label: 'Новосибирск' },
] as const;

type CityKey = (typeof CITY_OPTIONS)[number]['key'];

const DEMO_ORDERS: PublicOrder[] = [
  {
    order_id: 'demo-1', order_number: '101', work_type: 'labor',
    address: 'ул. Ленина, 25, Центральный р-н',
    address_lat: 54.9893, address_lng: 73.3686,
    status: 'pending', people_count: 4, hours: 8,
    created_at: new Date().toISOString(),
  },
  {
    order_id: 'demo-2', order_number: '102', work_type: 'equipment',
    address: 'ул. Красный Путь, 76, Кировский р-н',
    address_lat: 54.9815, address_lng: 73.2880,
    status: 'paid', people_count: 1, hours: 4,
    created_at: new Date().toISOString(), subcategory: 'Экскаватор 20 т',
  },
  {
    order_id: 'demo-3', order_number: '103', work_type: 'materials',
    address: 'пр. Мира, 32, Советский р-н',
    address_lat: 55.0185, address_lng: 73.3420,
    status: 'in_progress',
    created_at: new Date().toISOString(), subcategory: 'Бетон М300',
  },
  {
    order_id: 'demo-4', order_number: '104', work_type: 'labor',
    address: 'ул. 10 лет Октября, 40, Ленинский р-н',
    address_lat: 54.9520, address_lng: 73.3820,
    status: 'pending', people_count: 2, hours: 6,
    created_at: new Date().toISOString(),
  },
  {
    order_id: 'demo-5', order_number: '105', work_type: 'combo',
    address: 'ул. Воровского, 12, Октябрьский р-н',
    address_lat: 55.0040, address_lng: 73.4280,
    status: 'priced', people_count: 6, hours: 10,
    created_at: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityKey>('omsk');

  useEffect(() => {
    fetch('/api/orders/public')
      .then((r) => r.json())
      .then((d) => {
        const realOrders: PublicOrder[] = d.orders ?? [];
        const realIds = new Set(realOrders.map(o => o.order_id));
        const demoOnly = DEMO_ORDERS.filter(o => !realIds.has(o.order_id));
        setOrders([...realOrders, ...demoOnly]);
      })
      .catch(() => setOrders(DEMO_ORDERS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Navbar */}
      <nav className="navbar flex-shrink-0 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/#services" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-lg" />
            <span className="text-base font-extrabold text-brand-900 dark:text-white font-heading">Подряд PRO</span>
          </Link>
          <Link
            href="/order/new"
            className="btn-primary text-sm px-4 py-2 rounded-xl"
          >
            Разместить заказ
          </Link>
        </div>
      </nav>

      {/* Map area — fills remaining height */}
      <div className="relative flex-1 overflow-hidden">
        {/* Floating controls overlay */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {/* Order count badge */}
          {!loading && (
            <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur rounded-xl shadow-card px-3 py-2 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-dark-text">
                {orders.length} заказ{orders.length === 1 ? '' : orders.length < 5 ? 'а' : 'ов'} на карте
              </span>
            </div>
          )}

          {/* City toggle */}
          <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur rounded-xl shadow-card px-1.5 py-1.5 flex items-center gap-1">
            {CITY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setCity(opt.key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  city === opt.key
                    ? 'bg-[#2F5BFF] text-white'
                    : 'text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-dark-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map / loading / empty */}
        {loading ? (
          <div className="flex flex-col items-center h-full bg-surface dark:bg-dark-bg">
            {/* Floating skeleton controls */}
            <div className="w-full px-4 pt-4">
              <div className="flex justify-center gap-2 mb-4">
                <div className="skeleton h-9 w-32 rounded-xl" />
                <div className="skeleton h-9 w-28 rounded-xl" />
              </div>
            </div>
            {/* Skeleton map placeholder */}
            <div className="flex-1 w-full relative">
              <div className="absolute inset-0 skeleton rounded-none" />
              {/* Fake marker dots */}
              <div className="absolute top-1/3 left-1/4 w-3 h-3 rounded-full bg-brand-200/50 animate-pulse-dot" />
              <div className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-brand-200/50 animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
              <div className="absolute top-2/5 right-1/3 w-3 h-3 rounded-full bg-brand-200/50 animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-surface dark:bg-dark-bg">
            <div className="text-center max-w-xs px-6">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2F5BFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Пока нет заказов на карте</h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted mb-5">
                Заказы с указанным адресом появятся здесь автоматически
              </p>
              <Link href="/order/new" className="btn-primary text-sm px-5 py-2.5 rounded-xl">
                Разместить заказ
              </Link>
            </div>
          </div>
        ) : (
          <OrdersMap orders={orders} city={city} />
        )}
      </div>
    </div>
  );
}
