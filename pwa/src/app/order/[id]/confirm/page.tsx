'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderData {
  order_id?: string;
  work_type?: string;
  address?: string;
  total?: number;
  subtotal?: number;
  payout_amount?: number;
  escrow_status?: string;
}

type ConfirmResult =
  | { state: 'confirmed_both' }
  | { state: 'confirmed_waiting'; otherParty: string }
  | { state: 'already_confirmed' }
  | { state: 'error_invalid_token' }
  | { state: 'error_wrong_state' }
  | { state: 'error_generic'; message: string };

function ShieldIcon() {
  return (
    <svg
      className="h-10 w-10 text-[#2d35a8]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-14 w-14 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-14 w-14 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="h-14 w-14 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatAmount(amount?: number): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SkeletonLine({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`h-4 bg-gray-200 rounded animate-pulse ${wide ? 'w-3/4' : 'w-1/2'}`}
    />
  );
}

export default function ConfirmPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const id = params.id;
  const role = searchParams.get('role') as 'customer' | 'supplier' | null;
  const token = searchParams.get('token');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  // Validate URL params early
  const invalidLink = !role || !token || (role !== 'customer' && role !== 'supplier');

  useEffect(() => {
    if (invalidLink) {
      setOrderLoading(false);
      return;
    }
    fetch(`/api/orders/${id}`)
      .then((res) => {
        if (res.ok) return res.json() as Promise<OrderData>;
        return null;
      })
      .then((data) => {
        setOrder(data);
        setOrderLoading(false);
      })
      .catch(() => {
        setOrderLoading(false);
      });
  }, [id, invalidLink]);

  async function handleConfirm() {
    if (!token || !role) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, role }),
      });

      if (res.status === 401) {
        setResult({ state: 'error_invalid_token' });
        setConfirming(false);
        return;
      }
      if (res.status === 409) {
        setResult({ state: 'error_wrong_state' });
        setConfirming(false);
        return;
      }
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        setResult({ state: 'error_generic', message: errData.error ?? 'Неизвестная ошибка' });
        setConfirming(false);
        return;
      }

      const data = (await res.json()) as {
        status: string;
        role: string;
        bothConfirmed: boolean;
        escrowStatus: string;
      };

      if (data.status === 'already_confirmed') {
        setResult({ state: 'already_confirmed' });
      } else if (data.status === 'confirmed' && data.bothConfirmed) {
        setResult({ state: 'confirmed_both' });
      } else if (data.status === 'confirmed') {
        const otherParty = role === 'customer' ? 'исполнителя' : 'заказчика';
        setResult({ state: 'confirmed_waiting', otherParty });
      } else {
        setResult({ state: 'error_generic', message: 'Неожиданный ответ сервера' });
      }
    } catch {
      setResult({ state: 'error_generic', message: 'Ошибка соединения. Попробуйте снова.' });
    }
    setConfirming(false);
  }

  const roleLabel = role === 'customer' ? 'Заказчик' : 'Исполнитель';
  const roleBadgeColor =
    role === 'customer'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';

  const displayAmount =
    role === 'supplier'
      ? (order?.payout_amount ?? order?.subtotal)
      : (order?.total ?? order?.subtotal);

  // ── Error: invalid link ──
  if (invalidLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <WarningIcon />
          </div>
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Недействительная ссылка подтверждения
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Ссылка повреждена или не содержит необходимых данных.
          </p>
          <a
            href="mailto:support@podryad.pro"
            className="text-[#2d35a8] text-sm font-medium hover:underline"
          >
            Обратитесь в поддержку
          </a>
        </div>
      </div>
    );
  }

  // ── Post-confirmation result states ──
  if (result) {
    if (result.state === 'confirmed_both') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon />
            </div>
            <h2 className="text-xl font-bold text-emerald-600 mb-2">
              Обе стороны подтвердили!
            </h2>
            <p className="text-gray-600 text-sm mb-1">
              Оплата будет переведена исполнителю.
            </p>
            <p className="text-gray-400 text-xs">
              Перевод занимает 1–3 рабочих дня.
            </p>
            <Link
              href="/"
              className="mt-6 block w-full text-center py-3 rounded-lg bg-[#2d35a8] text-white font-semibold hover:bg-[#1a1f5c] transition-colors duration-200"
            >
              На главную
            </Link>
          </div>
        </div>
      );
    }

    if (result.state === 'confirmed_waiting') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <ClockIcon />
            </div>
            <h2 className="text-xl font-bold text-amber-600 mb-2">
              Вы подтвердили выполнение
            </h2>
            <p className="text-gray-600 text-sm">
              Ожидаем подтверждения от {result.otherParty}.
              <br />
              Оплата будет переведена после того, как обе стороны подтвердят.
            </p>
            <Link
              href="/"
              className="mt-6 block w-full text-center py-3 rounded-lg border border-[#2d35a8] text-[#2d35a8] font-semibold hover:bg-[#2d35a8] hover:text-white transition-colors duration-200"
            >
              На главную
            </Link>
          </div>
        </div>
      );
    }

    if (result.state === 'already_confirmed') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon />
            </div>
            <h2 className="text-xl font-bold text-[#2d35a8] mb-2">
              Вы уже подтвердили этот заказ
            </h2>
            <p className="text-gray-500 text-sm">
              Повторное подтверждение не требуется.
            </p>
            <Link
              href="/"
              className="mt-6 block w-full text-center py-3 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors duration-200"
            >
              На главную
            </Link>
          </div>
        </div>
      );
    }

    if (result.state === 'error_invalid_token') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <WarningIcon />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Ссылка недействительна или истекла
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Ссылка действительна 24 часа. Запросите новую у отправителя.
            </p>
            <a
              href="mailto:support@podryad.pro"
              className="text-[#2d35a8] text-sm font-medium hover:underline"
            >
              Обратитесь в поддержку
            </a>
          </div>
        </div>
      );
    }

    if (result.state === 'error_wrong_state') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <WarningIcon />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Заказ не в статусе подтверждения
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Этот заказ нельзя подтвердить в текущем статусе.
            </p>
            <a
              href="mailto:support@podryad.pro"
              className="text-[#2d35a8] text-sm font-medium hover:underline"
            >
              Обратитесь в поддержку
            </a>
          </div>
        </div>
      );
    }

    // error_generic
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <WarningIcon />
          </div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Ошибка</h2>
          <p className="text-gray-500 text-sm mb-6">
            {'message' in result ? result.message : 'Произошла ошибка. Попробуйте снова.'}
          </p>
          <a
            href="mailto:support@podryad.pro"
            className="text-[#2d35a8] text-sm font-medium hover:underline"
          >
            Обратитесь в поддержку
          </a>
        </div>
      </div>
    );
  }

  // ── Pre-confirmation state ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShieldIcon />
          <h1 className="text-xl font-bold text-[#1a1f5c]">Безопасная сделка</h1>
        </div>

        {/* Role badge */}
        <div className="mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${roleBadgeColor}`}>
            Вы: {roleLabel}
          </span>
        </div>

        {/* Order summary */}
        <div className="space-y-3 mb-6">
          {orderLoading ? (
            <>
              <div className="space-y-2">
                <SkeletonLine />
                <SkeletonLine wide />
                <SkeletonLine />
              </div>
            </>
          ) : order ? (
            <>
              {order.work_type && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Тип работ</span>
                  <span className="font-medium text-gray-700">{order.work_type}</span>
                </div>
              )}
              {order.address && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Адрес</span>
                  <span className="font-medium text-gray-700 text-right ml-4 max-w-[200px]">
                    {order.address}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Сумма</span>
                <span className="font-bold text-[#1a1f5c] text-base">
                  {formatAmount(displayAmount)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center">
              Не удалось загрузить данные заказа
            </p>
          )}
        </div>

        <hr className="border-gray-100 mb-6" />

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={confirming || orderLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#2d35a8] text-white rounded-lg py-3 text-lg font-semibold hover:bg-[#1a1f5c] transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {confirming && <SpinnerIcon />}
          {confirming ? 'Подтверждение...' : 'Подтвердить выполнение работ'}
        </button>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Нажимая кнопку, вы подтверждаете, что работы выполнены в полном объёме
        </p>
      </div>
    </div>
  );
}
