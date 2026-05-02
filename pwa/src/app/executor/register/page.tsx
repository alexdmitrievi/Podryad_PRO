'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExecutorRegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/executor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации');
        return;
      }

      setSuccess(true);
      router.push('/executor');
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-dark-bg px-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Регистрация успешна</h2>
          <p className="text-sm text-gray-500">Перенаправляем в личный кабинет…</p>
          <Link href="/executor" className="inline-block text-sm text-brand-500 hover:underline">
            Перейти в кабинет
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-white dark:bg-dark-bg">
      <Image src="/logo.png" alt="Подряд PRO" width={64} height={64} className="rounded-xl" />
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Регистрация исполнителя</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Бесплатно. Без процентов с заказов.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
            Имя
          </label>
          <input
            type="text"
            placeholder="Иван Петров"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
            Телефон
          </label>
          <input
            type="tel"
            placeholder="79001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
            Пароль
          </label>
          <input
            type="password"
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1 text-left">Заглавная буква + цифра</p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Регистрация…' : 'Зарегистрироваться'}
        </button>

        <p className="text-xs text-gray-400">
          Регистрируясь, вы принимаете{' '}
          <Link href="/privacy" className="text-brand-500 hover:underline">условия обработки данных (152-ФЗ)</Link>
        </p>
      </form>

      <div className="flex gap-4 text-sm">
        <Link href="/executor" className="text-brand-500 hover:underline">
          Уже зарегистрированы? Войти
        </Link>
        <Link href="/join" className="text-gray-400 hover:text-gray-600 transition-colors">
          Расширенная анкета →
        </Link>
      </div>
    </div>
  );
}
