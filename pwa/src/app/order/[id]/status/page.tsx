'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderData {
  order_id?: string;
  escrow_status?: string;
  total?: number;
  subtotal?: number;
  work_type?: string;
  address?: string;
  created_at?: string;
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-10 w-10 text-[#2d35a8]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-12 w-12 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
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

function XIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
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

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function StatusPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    // Initial fetch
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const data = (await res.json()) as OrderData;
          setOrder(data);
          return data;
        }
      } catch {
        // Ignore fetch errors during polling
      }
      return null;
    }

    // Fetch immediately
    fetchOrder().then((data) => {
      if (data?.escrow_status && data.escrow_status !== '') {
        setLoading(false);
        return;
      }

      // Start polling every 3 seconds
      const interval = setInterval(async () => {
        attempts++;
        const polled = await fetchOrder();
        if (
          (polled?.escrow_status && polled.escrow_status !== '') ||
          attempts >= maxAttempts
        ) {
          clearInterval(interval);
          setLoading(false);
        }
      }, 3000);

      // Clean up on unmount
      return () => clearInterval(interval);
    });
  }, [id]);

  const escrowStatus = order?.escrow_status ?? '';

  function renderStatusContent() {
    if (loading || !escrowStatus) {
      return (
        <div className="flex flex-col items-center text-center py-6">
          <SpinnerIcon />
          <p className="mt-4 text-gray-700 font-semibold text-lg">
            Ожидание подтверждения оплаты...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Это может занять несколько секунд
          </p>
        </div>
      );
    }

    if (escrowStatus === 'payment_held') {
      return (
        <div className="flex flex-col items-center text-center py-6">
          <CheckIcon />
          <p className="mt-4 text-emerald-600 font-bold text-xl">Оплата получена!</p>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            Средства заморожены до завершения работ.
            <br />
            Вы получите уведомление, когда нужно будет подтвердить выполнение.
          </p>
        </div>
      );
    }

    if (escrowStatus === 'cancelled') {
      return (
        <div className="flex flex-col items-center text-center py-6">
          <XIcon />
          <p className="mt-4 text-red-600 font-bold text-xl">Оплата отменена</p>
          <p className="text-gray-500 text-sm mt-2">
            Средства не были списаны. Вы можете попробовать снова.
          </p>
        </div>
      );
    }

    if (escrowStatus === 'payment_failed') {
      return (
        <div className="flex flex-col items-center text-center py-6">
          <XIcon />
          <p className="mt-4 text-red-600 font-bold text-xl">Ошибка оплаты</p>
          <p className="text-gray-500 text-sm mt-2">
            Не удалось провести платёж. Попробуйте другой способ оплаты.
          </p>
        </div>
      );
    }

    if (escrowStatus === 'pending_confirm' || escrowStatus === 'in_progress') {
      return (
        <div className="flex flex-col items-center text-center py-6">
          <CheckIcon />
          <p className="mt-4 text-[#2d35a8] font-bold text-xl">Оплата проведена</p>
          <p className="text-gray-600 text-sm mt-2">
            Работы выполняются. Ожидайте подтверждения от исполнителя.
          </p>
        </div>
      );
    }

    if (escrowStatus === 'completed') {
      return (
        <div className="flex flex-col items-center text-center py-6">
          <CheckIcon />
          <p className="mt-4 text-emerald-600 font-bold text-xl">Заказ завершён</p>
          <p className="text-gray-600 text-sm mt-2">
            Обе стороны подтвердили выполнение. Оплата переведена исполнителю.
          </p>
        </div>
      );
    }

    // Fallback for any other status
    return (
      <div className="flex flex-col items-center text-center py-6">
        <SpinnerIcon />
        <p className="mt-4 text-gray-700 font-medium">
          Статус: {escrowStatus}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-[#1a1f5c] mb-2 text-center">
          Статус оплаты
        </h1>

        {renderStatusContent()}

        {order && (
          <div className="mt-6 border-t border-gray-100 pt-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Номер заказа</span>
              <span className="font-medium text-gray-700 truncate ml-4 max-w-[180px]">
                {order.order_id ?? id}
              </span>
            </div>
            {order.work_type && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Тип работ</span>
                <span className="font-medium text-gray-700">{order.work_type}</span>
              </div>
            )}
            {(order.total ?? order.subtotal) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Сумма</span>
                <span className="font-medium text-gray-700">
                  {formatAmount(order.total ?? order.subtotal)}
                </span>
              </div>
            )}
            {order.created_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Дата заказа</span>
                <span className="font-medium text-gray-700">
                  {formatDate(order.created_at)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/order/${id}`}
            className="block w-full text-center py-3 rounded-lg border border-[#2d35a8] text-[#2d35a8] font-semibold hover:bg-[#2d35a8] hover:text-white transition-colors duration-200"
          >
            Вернуться к заказу
          </Link>
          <Link
            href="/"
            className="block w-full text-center py-3 rounded-lg text-gray-500 text-sm hover:underline"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
