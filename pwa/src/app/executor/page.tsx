'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LiveOrdersMap = dynamic(() => import('@/components/LiveOrdersMap'), { ssr: false });

type Tab = 'feed' | 'responses' | 'payouts';

interface ExecutorProfile {
  phone: string;
  name: string;
  telegram_id: string | null;
  city: string;
  rating: number | null;
  jobs_count: number;
}

export default function ExecutorPage() {
  const [profile, setProfile] = useState<ExecutorProfile | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.customer?.phone && data.customer?.name) {
          setProfile({
            phone: data.customer.phone,
            name: data.customer.name,
            telegram_id: data.customer.telegram_id ?? null,
            city: data.customer.city ?? '',
            rating: data.customer.rating ?? null,
            jobs_count: data.customer.jobs_count ?? 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/executor-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка входа');
        return;
      }

      setProfile(data.executor);
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoginLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-dark-bg">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-white dark:bg-dark-bg">
        <Image src="/logo.png" alt="Подряд PRO" width={64} height={64} className="rounded-xl" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Личный кабинет исполнителя</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          Войдите, чтобы видеть свои отклики и активные заказы
        </p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">Телефон</label>
            <input
              type="tel"
              placeholder="79001234567"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              className="w-full rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">Пароль</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loginLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <Link href="/join" className="text-sm text-brand-500 hover:underline">
          Ещё не зарегистрированы? Стать исполнителем
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Лента заказов' },
    { key: 'responses', label: 'Мои отклики' },
    { key: 'payouts', label: 'Выплаты' },
  ];

  const phoneDisplay = profile.phone
    ? `+7 ${profile.phone.slice(1, 4)} ${profile.phone.slice(4, 7)} ${profile.phone.slice(7, 9)} ${profile.phone.slice(9, 11)}`
    : '';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-dark-bg">
      <nav className="sticky top-0 z-30 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border h-16 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-lg" />
          <span className="text-base font-extrabold text-brand-900 dark:text-white font-heading">Подряд PRO</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
            {profile.name || phoneDisplay}
          </span>
          {profile.rating && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              ★ {profile.rating}
            </span>
          )}
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              setProfile(null);
            }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Выйти
          </button>
        </div>
      </nav>

      <div className="sticky top-16 z-20 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-4xl mx-auto flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {tab === 'feed' && (
          <div className="h-[calc(100vh-8rem)]">
            <LiveOrdersMap />
          </div>
        )}

        {tab === 'responses' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Мои отклики</h2>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-dark-border text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Отклики на заказы отображаются здесь после того, как вы откликнетесь на заказ в ленте.
              </p>
            </div>
          </div>
        )}

        {tab === 'payouts' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">История выплат</h2>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-dark-border text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Выплаты обрабатываются админом вручную (СБП / наличные). По вопросам обратитесь через MAX или Telegram.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
