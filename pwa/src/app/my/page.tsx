'use client';

import { useState } from 'react';
import Link from 'next/link';
import PhoneInput, { isValidPhone, getRawPhone } from '@/components/ui/PhoneInput';
import { showToast } from '@/components/ui/Toast';

export default function TokenRecoveryPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!isValidPhone(phone)) {
      showToast('Введите корректный номер телефона', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/my/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: getRawPhone(phone) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? 'Произошла ошибка. Попробуйте ещё раз.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Ошибка соединения. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-4">
          <span aria-hidden="true">&larr;</span> Главная
        </Link>
        {success ? (
          /* Success state */
          <div className="bg-green-50 border border-green-200 rounded-2xl shadow-elevated p-8 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-heading font-extrabold text-xl text-green-800 mb-2">
              Ссылка отправлена!
            </h2>
            <p className="text-sm text-green-700">
              Проверьте ваш мессенджер — мы отправили ссылку на номер{' '}
              <span className="font-semibold">{phone}</span>.
            </p>
          </div>
        ) : (
          /* Form state */
          <div className="bg-white rounded-2xl shadow-elevated p-8 animate-fade-in">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>

            <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] text-center mb-2">
              Восстановить доступ
            </h1>
            <p className="text-sm text-[var(--color-muted)] text-center mb-7 text-balance">
              Введите номер телефона — мы отправим ссылку на ваш дашборд
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5" htmlFor="phone">
                  Номер телефона
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm cursor-pointer hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Отправляем…
                  </>
                ) : (
                  'Получить ссылку'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
