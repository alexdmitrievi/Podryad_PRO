'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardOrderCard from '@/components/DashboardOrderCard';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_RATES, type Rate } from '@/lib/rates';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500">
      Загрузка карты…
    </div>
  ),
});

const WORK_TYPE_FILTERS: { id: string | null; label: string }[] = [
  { id: null, label: 'Все' },
  { id: 'грузчики', label: '💪 Грузчики' },
  { id: 'уборка', label: '🧹 Уборка' },
  { id: 'стройка', label: '🏗 Стройка' },
  { id: 'разнорабочие', label: '🔧 Разнорабочие' },
];

type SortMode = 'new' | 'pay_desc' | 'pay_asc';

function mergeOrders(prev: Order[], incoming: Order[]): Order[] {
  const prevById = new Map(prev.map((o) => [o.order_id, o]));
  return incoming.map((next) => {
    const old = prevById.get(next.order_id);
    if (!old) return next;
    if (
      old.status === next.status &&
      (old.executor_id ?? '') === (next.executor_id ?? '') &&
      old.worker_payout === next.worker_payout &&
      old.client_total === next.client_total &&
      old.comment === next.comment &&
      old.time === next.time &&
      old.address === next.address &&
      old.work_type === next.work_type
    ) {
      return old;
    }
    return next;
  });
}

function sortOrders(orders: Order[], sort: SortMode): Order[] {
  const arr = [...orders];
  if (sort === 'new') {
    arr.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sort === 'pay_desc') {
    arr.sort((a, b) => (b.worker_payout ?? 0) - (a.worker_payout ?? 0));
  } else {
    arr.sort((a, b) => (a.worker_payout ?? 0) - (b.worker_payout ?? 0));
  }
  return arr;
}

export default function DashboardPage() {
  const { loading: authLoading, userId, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [rates, setRates] = useState<Rate[]>(DEFAULT_RATES);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [, forceTimeLabel] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [manualRefresh, setManualRefresh] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [workFilter, setWorkFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('new');
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadOrders = useCallback(async (isManual = false) => {
    try {
      if (isManual) setManualRefresh(true);
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Не удалось загрузить заказы');
      const data = (await res.json()) as Order[];
      setOrders((prev) => mergeOrders(prev, data));
      setLastFetchAt(Date.now());
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      if (isManual) setManualRefresh(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders(false);

    const hasRealtime =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!hasRealtime) {
      const poll = setInterval(() => void loadOrders(false), 30_000);
      return () => clearInterval(poll);
    }

    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void loadOrders(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  useEffect(() => {
    const id = setInterval(() => forceTimeLabel((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/rates')
      .then((r) => r.json())
      .then((data: Rate[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setRates(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!workFilter) return true;
      return o.work_type.trim().toLowerCase() === workFilter;
    });
  }, [orders, workFilter]);

  const sorted = useMemo(
    () => sortOrders(filtered, sort),
    [filtered, sort]
  );

  const secsLabel =
    lastFetchAt == null
      ? null
      : Math.floor((Date.now() - lastFetchAt) / 1000);

  const minWorkerRate = useMemo(() => {
    if (!rates.length) return 0;
    return Math.min(...rates.map((r) => r.worker_rate));
  }, [rates]);

  const distinctTypes = useMemo(() => {
    const s = new Set(
      filtered.map((o) => o.work_type.trim().toLowerCase()).filter(Boolean)
    );
    return s.size;
  }, [filtered]);

  const handleRespond = async (orderId: string) => {
    setRespondError(null);
    setRespondingId(orderId);
    try {
      const res = await fetch('/api/orders/respond', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Ошибка отклика');
      }
      await loadOrders(false);
    } catch (e) {
      setRespondError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 pt-16">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title="📋 Доска заказов"
          subtitle="Активные предложения"
          backHref="/"
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-lg space-y-4 p-4 pb-6">
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
              <div className="rounded-2xl bg-white px-2 py-3 shadow-card">
                <div className="text-lg leading-none">🟢</div>
                <div className="mt-1 font-bold text-gray-900">{filtered.length}</div>
                <div className="text-[10px] text-gray-500 sm:text-xs">активных</div>
              </div>
              <div className="rounded-2xl bg-white px-2 py-3 shadow-card">
                <div className="text-lg leading-none">💰</div>
                <div className="mt-1 font-bold text-gray-900">
                  от {minWorkerRate.toLocaleString('ru-RU')}₽/ч
                </div>
                <div className="text-[10px] text-gray-500 sm:text-xs">ставка</div>
              </div>
              <div className="rounded-2xl bg-white px-2 py-3 shadow-card">
                <div className="text-lg leading-none">👥</div>
                <div className="mt-1 font-bold text-gray-900">{distinctTypes}</div>
                <div className="text-[10px] text-gray-500 sm:text-xs">типов</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-colors ${
                  view === 'list'
                    ? 'bg-[#0088cc] text-white'
                    : 'bg-white text-gray-600 shadow-card'
                }`}
              >
                📋 Список
              </button>
              <button
                type="button"
                onClick={() => setView('map')}
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-colors ${
                  view === 'map'
                    ? 'bg-[#0088cc] text-white'
                    : 'bg-white text-gray-600 shadow-card'
                }`}
              >
                🗺 Карта
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                {secsLabel != null
                  ? `Обновлено ${secsLabel} сек назад`
                  : 'Загрузка…'}
              </span>
              <button
                type="button"
                disabled={manualRefresh}
                onClick={() => void loadOrders(true)}
                className="rounded-xl bg-white px-3 py-1.5 font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 disabled:opacity-50"
              >
                🔄 Обновить
              </button>
            </div>

            {fetchError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {fetchError}
              </p>
            ) : null}
            {respondError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {respondError}
              </p>
            ) : null}

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {WORK_TYPE_FILTERS.map((chip) => {
                const active = workFilter === chip.id;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setWorkFilter(chip.id)}
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-brand-500 text-white'
                        : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor="dash-sort" className="sr-only">
                Сортировка
              </label>
              <select
                id="dash-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm"
              >
                <option value="new">Новые сначала</option>
                <option value="pay_desc">По оплате ↓</option>
                <option value="pay_asc">По оплате ↑</option>
              </select>
            </div>

            {view === 'list' ? (
              sorted.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-card">
                  <div className="text-4xl">📭</div>
                  <p className="mt-3 font-semibold text-gray-900">
                    Пока нет активных заказов
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Новые заказы появляются ежедневно.
                  </p>
                  <button
                    type="button"
                    disabled={manualRefresh}
                    onClick={() => void loadOrders(true)}
                    className="mt-4 rounded-2xl bg-[#0088cc] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Обновить
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {sorted.map((order) => (
                    <li key={order.order_id}>
                      <DashboardOrderCard
                        order={order}
                        userRole={authLoading ? null : role}
                        onRespond={handleRespond}
                        isResponding={respondingId === order.order_id}
                        isMyOrder={
                          !!userId &&
                          order.executor_id === userId &&
                          order.status === 'closed'
                        }
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="h-[min(55vh,420px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
                <MapView orders={sorted} />
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
