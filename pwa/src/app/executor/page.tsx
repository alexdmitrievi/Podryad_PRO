'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LiveOrdersMap = dynamic(() => import('@/components/LiveOrdersMap'), { ssr: false });

type Tab = 'feed' | 'responses' | 'payouts';

interface OrderResponse {
  id: string;
  order_id: string;
  contractor_phone: string;
  contractor_name: string;
  status: string;
  created_at: string;
}

export default function ExecutorPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>('feed');
  const [responses, setResponses] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('executor_phone');
    if (saved) {
      setPhone(saved);
      setLoggedIn(true);
      fetchResponses(saved);
    }
  }, []);

  async function fetchResponses(phoneNum: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/responses?phone=${encodeURIComponent(phoneNum)}`, {
        headers: { 'x-admin-pin': localStorage.getItem('admin_pin') || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || data.data || []);
      }
    } catch {
      // Non-critical
    }
    setLoading(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Введите корректный номер телефона');
      return;
    }
    sessionStorage.setItem('executor_phone', digits);
    setPhone(digits);
    setLoggedIn(true);
    setError('');
    fetchResponses(digits);
  }

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-white dark:bg-dark-bg">
        <Image src="/logo.png" alt="Подряд PRO" width={64} height={64} className="rounded-xl" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Личный кабинет исполнителя</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          Введите номер телефона, чтобы увидеть свои отклики и активные заказы
        </p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <input
            type="tel"
            placeholder="+7 (999) 123-45-67"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            className="w-full rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Войти
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border h-16 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-lg" />
          <span className="text-base font-extrabold text-brand-900 dark:text-white font-heading">Подряд PRO</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
            {name || `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)}`}
          </span>
          <button
            onClick={() => { sessionStorage.removeItem('executor_phone'); setLoggedIn(false); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Выйти
          </button>
        </div>
      </nav>

      {/* Tabs */}
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

      {/* Content */}
      <div className="flex-1">
        {tab === 'feed' && (
          <div className="h-[calc(100vh-8rem)]">
            <LiveOrdersMap />
          </div>
        )}

        {tab === 'responses' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Мои отклики</h2>
            {loading ? (
              <p className="text-gray-500 text-sm">Загрузка...</p>
            ) : responses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">У вас пока нет откликов</p>
                <p className="text-sm text-gray-400 mt-2">
                  Перейдите во вкладку «Лента заказов», чтобы найти заказы и откликнуться
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {responses.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Заказ {r.order_id?.slice(0, 12)}...
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        r.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {r.status === 'accepted' ? 'Принят' : r.status === 'rejected' ? 'Отклонён' : 'На рассмотрении'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">История выплат</h2>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-dark-border text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Выплаты обрабатываются админом вручную (СБП / наличные).
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                По вопросам выплат обратитесь к администратору через MAX или Telegram.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <a
                  href={process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-500 hover:underline"
                >
                  Написать в MAX
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-500 hover:underline"
                >
                  Написать в Telegram
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
