'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-[#2d35a8]"
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

export default function PayPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id;

  const subtotalParam = searchParams.get('subtotal');
  const phone = searchParams.get('phone');
  const comboDiscountParam = searchParams.get('comboDiscount');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state (used when params not provided via URL)
  const [formSubtotal, setFormSubtotal] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!subtotalParam || !phone) {
      setShowForm(true);
      return;
    }
    initiatePayment(Number(subtotalParam), phone, comboDiscountParam ? Number(comboDiscountParam) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initiatePayment(subtotal: number, customerPhone: string, comboDiscount = 0) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/create-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          subtotal,
          comboDiscount,
          customerPhone,
          returnUrl: `${window.location.origin}/order/${id}/status`,
        }),
      });

      const data = (await res.json()) as { confirmationUrl?: string; error?: string };

      if (!res.ok) {
        setError(data.error || 'Ошибка при создании платежа');
        setLoading(false);
        return;
      }

      if (!data.confirmationUrl) {
        setError('Не удалось получить ссылку для оплаты');
        setLoading(false);
        return;
      }

      // Redirect to YooKassa payment page
      window.location.href = data.confirmationUrl;
    } catch {
      setError('Ошибка соединения. Проверьте интернет и попробуйте снова.');
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subtotal = Number(formSubtotal);
    if (!subtotal || subtotal <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    if (!formPhone) {
      setError('Введите номер телефона');
      return;
    }
    initiatePayment(subtotal, formPhone);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <SpinnerIcon />
          </div>
          <p className="text-gray-700 font-medium text-lg">
            Перенаправление на страницу оплаты...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Пожалуйста, не закрывайте страницу
          </p>
        </div>
      </div>
    );
  }

  if (showForm && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-xl font-bold text-[#1a1f5c] mb-6">Оплата заказа</h1>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сумма (руб.)
              </label>
              <input
                type="number"
                value={formSubtotal}
                onChange={(e) => setFormSubtotal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2d35a8]"
                placeholder="5000"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2d35a8]"
                placeholder="+79001234567"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#2d35a8] text-white rounded-lg py-3 font-semibold hover:bg-[#1a1f5c] transition-colors duration-200 cursor-pointer"
            >
              Перейти к оплате
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="h-12 w-12 text-red-500"
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
          </div>
          <p className="text-red-600 font-semibold text-lg mb-2">Ошибка оплаты</p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (subtotalParam && phone) {
                initiatePayment(
                  Number(subtotalParam),
                  phone,
                  comboDiscountParam ? Number(comboDiscountParam) : 0
                );
              } else {
                setShowForm(true);
              }
            }}
            className="w-full bg-[#2d35a8] text-white rounded-lg py-3 font-semibold hover:bg-[#1a1f5c] transition-colors duration-200 cursor-pointer"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => router.back()}
            className="mt-3 w-full text-[#2d35a8] text-sm hover:underline cursor-pointer"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  // Initial loading state before useEffect fires
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <SpinnerIcon />
        </div>
        <p className="text-gray-700 font-medium text-lg">
          Подготовка платежа...
        </p>
      </div>
    </div>
  );
}
