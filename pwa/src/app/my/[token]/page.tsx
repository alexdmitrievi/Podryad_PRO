'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/* ── Types ──────────────────────────────────────────────────── */

type OrderStatus =
  | 'pending'
  | 'priced'
  | 'payment_sent'
  | 'paid'
  | 'in_progress'
  | 'confirming'
  | 'completed'
  | 'disputed'
  | 'cancelled';

interface Order {
  id: string;
  order_number?: string;
  work_type: string;
  subcategory?: string;
  address?: string;
  work_date?: string;
  people_count?: number;
  hours?: number;
  status: OrderStatus;
  display_price?: number;
}

interface ApiResponse {
  phone: string;
  orders: Order[];
}

/* ── Constants ──────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badge: string }
> = {
  pending:      { label: 'На рассмотрении', badge: 'bg-gray-100 text-gray-600' },
  priced:       { label: 'Ожидает оплату',  badge: 'bg-amber-100 text-amber-700' },
  payment_sent: { label: 'Ожидает оплату',  badge: 'bg-amber-100 text-amber-700' },
  paid:         { label: 'Оплачен',          badge: 'bg-blue-100 text-blue-700' },
  in_progress:  { label: 'В работе',         badge: 'bg-blue-100 text-blue-700' },
  confirming:   { label: 'Подтверждение',    badge: 'bg-blue-100 text-blue-700' },
  completed:    { label: 'Завершён',          badge: 'bg-green-100 text-green-700' },
  disputed:     { label: 'Спор',             badge: 'bg-red-100 text-red-700' },
  cancelled:    { label: 'Отменён',           badge: 'bg-gray-100 text-gray-500' },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  'pending', 'priced', 'payment_sent', 'paid', 'in_progress', 'confirming',
];
const PAYMENT_NEEDED: OrderStatus[] = ['priced', 'payment_sent'];

/* ── Helpers ─────────────────────────────────────────────────── */

function formatPrice(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

function shortId(order: Order): string {
  if (order.order_number) return `#${order.order_number}`;
  return `#${order.id.slice(0, 8).toUpperCase()}`;
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const isPayment = PAYMENT_NEEDED.includes(order.status);
  const isInProgress = order.status === 'in_progress';

  return (
    <div
      className={`rounded-xl border p-4 shadow-card transition-all duration-200 hover:shadow-card-hover ${
        isPayment
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-[var(--color-border)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-heading font-bold text-sm text-[var(--color-text)]">
            {shortId(order)}
          </span>
          {order.work_type && (
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              {order.work_type}
              {order.subcategory ? ` · ${order.subcategory}` : ''}
            </p>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Details */}
      <div className="space-y-1 mb-3">
        {order.address && (
          <p className="text-sm text-[var(--color-text)] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--color-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {order.address}
          </p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {order.work_date && (
            <span className="text-xs text-[var(--color-muted)]">{order.work_date}</span>
          )}
          {order.people_count != null && (
            <span className="text-xs text-[var(--color-muted)]">{order.people_count} чел.</span>
          )}
          {order.hours != null && (
            <span className="text-xs text-[var(--color-muted)]">{order.hours} ч.</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
        <div>
          {order.display_price != null && (
            <span className="font-heading font-bold text-base text-brand-500">
              {formatPrice(order.display_price)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isPayment && (
            <Link
              href={`/order/${order.id}/pay`}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold cursor-pointer hover:bg-amber-600 transition-colors duration-150"
            >
              Оплатить
            </Link>
          )}
          {isInProgress && (
            <>
              <Link
                href={`/order/${order.id}/confirm`}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-semibold cursor-pointer hover:bg-brand-600 transition-colors duration-150"
              >
                Подтвердить
              </Link>
              <Link
                href={`/order/${order.id}/dispute`}
                className="inline-flex items-center px-3 py-1.5 rounded-xl border border-red-300 text-red-600 text-xs font-semibold cursor-pointer hover:bg-red-50 transition-colors duration-150"
              >
                Спор
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function CustomerDashboard() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/orders/my?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  /* Loading */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-muted)]">Загрузка…</p>
        </div>
      </div>
    );
  }

  /* Not found */
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-elevated p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-heading font-extrabold text-xl text-[var(--color-text)] mb-2">
            Ссылка недействительна
          </h2>
          <p className="text-sm text-[var(--color-muted)] mb-6">
            Ссылка устарела или не существует. Запросите новую ссылку.
          </p>
          <Link
            href="/my"
            className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm cursor-pointer hover:bg-brand-600 transition-colors duration-150"
          >
            Получить новую ссылку
          </Link>
        </div>
      </div>
    );
  }

  const active = data.orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completed = data.orders.filter((o) => o.status === 'completed' || o.status === 'disputed' || o.status === 'cancelled');
  const countActive = active.length;
  const countCompleted = completed.length;
  const countAwaitingPayment = data.orders.filter((o) =>
    PAYMENT_NEEDED.includes(o.status)
  ).length;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div
        className="section-gradient px-4 py-12 sm:py-14 relative overflow-hidden"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors mb-1"
              >
                <span aria-hidden="true">&larr;</span> Главная
              </Link>
              <h1 className="font-heading font-extrabold text-2xl text-white mb-1">
                Мои заказы
              </h1>
              {data.phone && (
                <p className="text-white/70 text-sm">{data.phone}</p>
              )}
            </div>
            <Link
              href="/order/new"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer transition-colors duration-150 bg-white/15 backdrop-blur-sm hover:bg-white/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новый заказ
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-1 pb-10">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 bg-white rounded-xl shadow-card p-4 mb-6 -mt-3">
          <div className="text-center">
            <p className="font-heading font-extrabold text-2xl text-brand-500">{countActive}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-tight">Активных</p>
          </div>
          <div className="text-center border-x border-[var(--color-border)]">
            <p className="font-heading font-extrabold text-2xl text-green-500">{countCompleted}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-tight">Завершённых</p>
          </div>
          <div className="text-center">
            <p className="font-heading font-extrabold text-2xl text-amber-500">{countAwaitingPayment}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-tight">К оплате</p>
          </div>
        </div>

        {/* Active orders */}
        {active.length > 0 && (
          <section className="mb-6">
            <h2 className="font-heading font-bold text-base text-[var(--color-text)] mb-3">
              Активные заказы
            </h2>
            <div className="space-y-3 list-stagger">
              {active.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Completed orders */}
        {completed.length > 0 && (
          <section className="opacity-80">
            <h2 className="font-heading font-bold text-base text-[var(--color-muted)] mb-3">
              Завершённые
            </h2>
            <div className="space-y-3 list-stagger">
              {completed.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {data.orders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-heading font-bold text-lg text-[var(--color-text)] mb-2">
              Заказов пока нет
            </p>
            <p className="text-sm text-[var(--color-muted)] mb-6">
              Оформите первый заказ прямо сейчас
            </p>
            <Link
              href="/order/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm cursor-pointer hover:bg-brand-600 transition-colors duration-150"
            >
              Оформить заказ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
