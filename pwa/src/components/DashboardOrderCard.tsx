'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Clock, Users, Banknote, MessageCircle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import ConfirmModal from '@/components/ConfirmModal';
import YandexButton from '@/components/YandexButton';
import type { Order } from '@/lib/types';

export function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}

const workTypeEmoji: Record<string, string> = {
  грузчики: '💪',
  уборка: '🧹',
  стройка: '🏗',
  разнорабочие: '🔧',
  другое: '📋',
};

function workTypeLine(workType: string): string {
  const key = workType.trim().toLowerCase();
  const emoji = workTypeEmoji[key] ?? '📋';
  const label =
    workType.trim().length > 0
      ? workType.trim().charAt(0).toUpperCase() + workType.trim().slice(1).toLowerCase()
      : 'Заказ';
  return `${emoji} ${label}`;
}

const statusBorderClass: Record<string, string> = {
  published: 'border-l-4 border-l-brand-500',
  closed: 'border-l-4 border-l-emerald-500',
  pending: 'border-l-4 border-l-amber-400',
  paid: 'border-l-4 border-l-amber-400',
  cancelled: 'border-l-4 border-l-red-400',
  done: 'border-l-4 border-l-emerald-600',
};

const statusLabelMap: Record<string, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  published: 'Активен',
  closed: 'Закрыт',
  cancelled: 'Отменён',
  done: 'Выполнен',
};

export interface DashboardOrderCardProps {
  order: Order;
  userRole: 'customer' | 'worker' | null;
  /** Должен резолвиться после завершения запроса (для модалки и спиннера). */
  onRespond: (orderId: string) => Promise<void>;
  isResponding: boolean;
  isMyOrder: boolean;
  /** Index for staggered animation delay. */
  index?: number;
}

export default function DashboardOrderCard({
  order,
  userRole,
  onRespond,
  isResponding,
  isMyOrder,
  index,
}: DashboardOrderCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmRespond = async () => {
    setSubmitting(true);
    try {
      await onRespond(order.order_id);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const financeLine = () => {
    if (userRole === 'worker') {
      if (order.worker_payout != null) {
        return (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Banknote size={14} className="text-gray-400 shrink-0" /> На руки: {order.worker_payout.toLocaleString('ru-RU')}₽
          </p>
        );
      }
      return <p className="flex items-center gap-1.5 text-sm text-gray-500"><Banknote size={14} className="text-gray-400 shrink-0" /> Оплата уточняется</p>;
    }
    if (userRole === 'customer') {
      if (order.client_total != null) {
        return (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Banknote size={14} className="text-gray-400 shrink-0" /> Стоимость: {order.client_total.toLocaleString('ru-RU')}₽
          </p>
        );
      }
      return <p className="flex items-center gap-1.5 text-sm text-gray-500"><Banknote size={14} className="text-gray-400 shrink-0" /> Стоимость уточняется</p>;
    }
    return <p className="text-sm text-amber-800/90">Войдите чтобы увидеть оплату</p>;
  };

  const showRespond =
    userRole === 'worker' && order.status === 'published' && !isMyOrder;

  return (
    <>
      <article
        className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-card dark:bg-dark-card dark:border-dark-border dark:text-dark-text animate-fade-in opacity-0 ${statusBorderClass[order.status] || 'border-l-4 border-l-gray-200'}`}
        style={{ animationDelay: `${(index || 0) * 80}ms` }}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-bold text-gray-900">{workTypeLine(order.work_type)}</p>
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-gray-500">
            <Badge variant={order.status}>{statusLabelMap[order.status] ?? order.status}</Badge>
            <span className="font-mono font-semibold text-gray-700">#{order.order_id}</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Clock size={14} className="text-gray-400 shrink-0" /> {order.created_at ? timeAgo(order.created_at) : '—'}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <p className="flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            {order.address}
          </p>
          {order.time ? (
            <p className="flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400 shrink-0" />
              {order.time}
            </p>
          ) : null}
          <p className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-400 shrink-0" />
            {order.people} чел. × {order.hours} ч.
          </p>
          {financeLine()}
          {order.comment ? (
            <p className="flex items-start gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-gray-600">
              <MessageCircle size={14} className="text-gray-400 shrink-0 mt-0.5" />
              &quot;{order.comment}&quot;
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="min-w-0 flex-1">
            <YandexButton lat={order.lat} lon={order.lon} address={order.address} />
          </div>

          {userRole === null ? (
            <Link
              href="/auth/login?redirect=/dashboard"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 active:scale-[0.99] sm:max-w-[11rem]"
            >
              Войдите
            </Link>
          ) : null}

          {userRole === 'worker' && isMyOrder ? (
            <button
              type="button"
              disabled
              className="flex flex-1 cursor-default items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 sm:max-w-[11rem]"
            >
              ✅ Вы взяли этот заказ
            </button>
          ) : null}

          {showRespond ? (
            <button
              type="button"
              disabled={isResponding || submitting}
              onClick={() => setConfirmOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 active:scale-[0.99] disabled:opacity-60 sm:max-w-[11rem]"
            >
              ✅ Откликнуться
            </button>
          ) : null}
        </div>
      </article>

      <ConfirmModal
        open={confirmOpen}
        title="Подтвердить отклик"
        confirmText="Взять заказ"
        loading={submitting || isResponding}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          void handleConfirmRespond();
        }}
      >
        <p>
          Заказ #{order.order_id}
          {order.address ? ` — ${order.address}` : ''}
        </p>
      </ConfirmModal>
    </>
  );
}
