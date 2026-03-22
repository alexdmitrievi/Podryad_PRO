'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import type { Order } from '@/lib/types';

const STATUS_CONFIG: Record<
  string,
  { emoji: string; title: string; color: string }
> = {
  pending: {
    emoji: '⏳',
    title: 'Ожидание оплаты',
    color: 'text-amber-600',
  },
  paid: {
    emoji: '✅',
    title: 'Оплата прошла! Ваш заказ опубликован',
    color: 'text-emerald-600',
  },
  published: {
    emoji: '✅',
    title: 'Оплата прошла! Ваш заказ опубликован',
    color: 'text-emerald-600',
  },
  closed: {
    emoji: '🤝',
    title: 'Исполнитель найден!',
    color: 'text-blue-600',
  },
  done: {
    emoji: '🎉',
    title: 'Заказ выполнен',
    color: 'text-emerald-600',
  },
  cancelled: {
    emoji: '❌',
    title: 'Заказ отменён',
    color: 'text-red-600',
  },
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-3xl transition-transform hover:scale-110 ${
            star <= value ? 'text-yellow-400' : 'text-gray-300'
          }`}
          aria-label={`Оценка ${star}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [order, setOrder] = useState<Partial<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating
  const [rating, setRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Не удалось загрузить заказ');
      }
      const data = (await res.json()) as Partial<Order>;
      setOrder(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  // Auto-refresh every 5 seconds while pending
  useEffect(() => {
    if (!order || order.status !== 'pending') return;
    const interval = setInterval(() => void fetchOrder(), 5000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  const handleRate = async () => {
    if (!orderId || rating < 1 || rating > 5) return;
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      const res = await fetch('/api/orders/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, score: rating }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Ошибка отправки оценки');
      }
      setRatingDone(true);
    } catch (e) {
      setRatingError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (!orderId) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <p className="text-4xl">🔍</p>
        <p className="mt-3 font-semibold text-gray-900">
          Заказ не указан
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Отсутствует параметр order_id
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-2xl bg-[#0088cc] px-6 py-2.5 text-sm font-semibold text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <span className="text-sm text-gray-400">Загрузка...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <p className="text-4xl">⚠️</p>
        <p className="mt-3 font-semibold text-gray-900">Ошибка</p>
        <p className="mt-1 text-sm text-red-600">{error || 'Заказ не найден'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchOrder();
          }}
          className="mt-4 rounded-2xl bg-[#0088cc] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Повторить
        </button>
      </div>
    );
  }

  const status = order.status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="rounded-2xl bg-white p-6 text-center shadow-card">
        <p className="text-5xl">{config.emoji}</p>
        <h2 className={`mt-3 text-lg font-bold ${config.color}`}>
          {config.title}
        </h2>

        {status === 'pending' && (
          <p className="mt-2 text-xs text-gray-400 animate-pulse">
            Автоматическая проверка каждые 5 секунд...
          </p>
        )}
      </div>

      {/* Order summary */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 text-sm font-bold text-gray-900">
          Информация о заказе
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Номер заказа</dt>
            <dd className="font-semibold text-gray-900">#{orderId}</dd>
          </div>
          {order.work_type && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Тип работ</dt>
              <dd className="font-semibold text-gray-900">{order.work_type}</dd>
            </div>
          )}
          {order.address && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Адрес</dt>
              <dd className="font-semibold text-gray-900 text-right max-w-[60%]">
                {order.address}
              </dd>
            </div>
          )}
          {order.client_total != null && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Сумма</dt>
              <dd className="font-bold text-brand-500">
                {order.client_total.toLocaleString('ru-RU')} ₽
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Action buttons by status */}
      {status === 'pending' && (
        <div className="rounded-2xl bg-white p-5 shadow-card text-center">
          <p className="text-sm text-gray-500 mb-3">
            Если оплата не прошла, попробуйте ещё раз
          </p>
          <button
            type="button"
            onClick={() => {
              // Redirect to the same payment flow
              window.location.href = `/customer?retry_order=${orderId}`;
            }}
            className="w-full rounded-2xl bg-[#0088cc] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#006da3] active:scale-[0.98]"
          >
            Повторить оплату
          </button>
        </div>
      )}

      {(status === 'paid' || status === 'published') && (
        <div className="rounded-2xl bg-white p-5 shadow-card text-center">
          <p className="text-sm text-gray-500 mb-3">
            Ваш заказ размещён на доске. Исполнители уже видят его.
          </p>
          <Link
            href="/dashboard"
            className="inline-block w-full rounded-2xl bg-[#0088cc] py-3 text-sm font-semibold text-white text-center transition-colors hover:bg-[#006da3]"
          >
            Перейти в личный кабинет
          </Link>
        </div>
      )}

      {status === 'done' && !ratingDone && (
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h3 className="mb-2 text-sm font-bold text-gray-900 text-center">
            Оцените работу исполнителя
          </h3>
          <p className="text-xs text-gray-500 text-center mb-4">
            Ваша оценка поможет другим заказчикам
          </p>
          <div className="flex justify-center mb-4">
            <StarRating value={rating} onChange={setRating} />
          </div>
          {ratingError && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 text-center">
              {ratingError}
            </p>
          )}
          <button
            type="button"
            disabled={rating < 1 || ratingSubmitting}
            onClick={() => void handleRate()}
            className="w-full rounded-2xl bg-[#0088cc] py-3 text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:bg-[#006da3] active:scale-[0.98]"
          >
            {ratingSubmitting ? 'Отправка...' : 'Отправить оценку'}
          </button>
        </div>
      )}

      {status === 'done' && ratingDone && (
        <div className="rounded-2xl bg-white p-5 shadow-card text-center">
          <p className="text-2xl">⭐</p>
          <p className="mt-2 text-sm font-semibold text-emerald-600">
            Спасибо за оценку!
          </p>
        </div>
      )}

      {/* Back link */}
      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-brand-500 font-semibold hover:text-brand-700 transition-colors"
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <PageHeader
        title="Статус оплаты"
        subtitle="Информация о заказе и оплате"
        backHref="/"
      />
      <main className="mx-auto max-w-lg space-y-4 p-4 pb-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <span className="text-sm text-gray-400">Загрузка...</span>
            </div>
          }
        >
          <PaymentContent />
        </Suspense>
      </main>
    </div>
  );
}
