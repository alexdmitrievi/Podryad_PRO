'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface DashboardResponse {
  id: number;
  order_id: string;
  comment: string | null;
  price: number | null;
  status: string;
  created_at: string;
  order: {
    order_id: string;
    order_number: string | null;
    work_type: string;
    address: string | null;
    status: string;
    created_at: string;
  } | null;
}

interface AssignedOrder {
  order_id: string;
  order_number: string | null;
  work_type: string;
  address: string | null;
  status: string;
  payment_status: string | null;
  executor_payout_status: string | null;
  executor_payout_at: string | null;
  customer_total: number | null;
  supplier_payout: number | null;
  display_price: number | null;
  created_at: string;
}

function formatPhone(phone: string): string {
  if (phone.length < 10) return phone;
  return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)}`;
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'На рассмотрении',
    priced: 'Ожидает оплату',
    payment_sent: 'Счёт отправлен',
    paid: 'Оплачен',
    in_progress: 'В работе',
    confirming: 'Подтверждение',
    completed: 'Завершён',
    disputed: 'Спор',
    cancelled: 'Отменён',
    closed: 'Архив',
  };
  return labels[status] || status;
}

export default function ExecutorPage() {
  const [profile, setProfile] = useState<ExecutorProfile | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Dashboard data
  const [responses, setResponses] = useState<DashboardResponse[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch('/api/executor/dashboard');
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
        setAssignedOrders(data.assignedOrders || []);
        if (data.profile && !profile) {
          setProfile(data.profile);
        }
      }
    } catch {
      // silent
    } finally {
      setDashLoading(false);
    }
  }, [profile]);

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.customer?.phone && data.customer?.name && data.customer?.role === 'worker') {
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

  useEffect(() => {
    if (profile) {
      fetchDashboard();
    }
  }, [profile, fetchDashboard]);

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
        <div className="flex gap-4 text-sm">
          <Link href="/executor/register" className="text-brand-500 hover:underline font-semibold">
            Зарегистрироваться
          </Link>
          <Link href="/join" className="text-gray-400 hover:text-gray-600 transition-colors">
            Расширенная анкета →
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'feed', label: 'Лента заказов' },
    { key: 'responses', label: 'Мои отклики', badge: responses.filter(r => r.status === 'pending').length || undefined },
    { key: 'payouts', label: 'Выплаты', badge: assignedOrders.filter(o => o.status === 'completed' && o.executor_payout_status === 'pending').length || undefined },
  ];

  const phoneDisplay = profile.phone ? formatPhone(profile.phone) : '';

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
            {profile.name || phoneDisplay}
          </span>
          {profile.rating != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              ★ {profile.rating}
            </span>
          )}
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              setProfile(null);
              setResponses([]);
              setAssignedOrders([]);
            }}
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
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 relative ${
                tab === t.key
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="absolute -top-0.5 right-1/4 inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-red-500 rounded-full">
                  {t.badge}
                </span>
              ) : null}
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
            {dashLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
              </div>
            ) : responses.length > 0 ? (
              <div className="space-y-3">
                {responses.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        {r.order ? (
                          <Link href={`/order/${r.order.order_id}/status`} className="font-semibold text-sm text-brand-500 hover:underline">
                            {r.order.order_number || `Заказ #${r.order_id.slice(0, 8)}`}
                          </Link>
                        ) : (
                          <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                            Заказ #{r.order_id.slice(0, 8)}
                          </span>
                        )}
                        {r.order && (
                          <p className="text-xs text-gray-500 mt-0.5">{r.order.work_type} · {statusLabel(r.order.status)}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status === 'accepted' ? 'Принят' : r.status === 'rejected' ? 'Отклонён' : 'На рассмотрении'}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{r.comment}</p>
                    )}
                    {r.price != null && (
                      <p className="text-xs text-gray-400">Предложено: {formatPrice(r.price)}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-2">
                      {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-dark-card rounded-2xl p-8 border border-gray-100 dark:border-dark-border text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  У вас пока нет откликов. Откликайтесь на заказы в ленте — они появятся здесь.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">История выплат</h2>
            {dashLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
              </div>
            ) : assignedOrders.length > 0 ? (
              <div className="space-y-3">
                {assignedOrders.map((o) => (
                  <div key={o.order_id} className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          {o.order_number || `#${o.order_id.slice(0, 8)}`}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{o.work_type} · {statusLabel(o.status)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                          {formatPrice(o.supplier_payout || o.display_price)}
                        </p>
                        {o.executor_payout_status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            o.executor_payout_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {o.executor_payout_status === 'paid' ? 'Выплачено' : 'Ожидает выплаты'}
                          </span>
                        )}
                      </div>
                    </div>
                    {o.address && (
                      <p className="text-xs text-gray-400">{o.address}</p>
                    )}
                    {o.executor_payout_at && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        Выплата: {new Date(o.executor_payout_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-dark-card rounded-2xl p-8 border border-gray-100 dark:border-dark-border text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  У вас пока нет завершённых заказов с выплатами. Выплаты обрабатываются админом вручную (СБП / наличные).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
