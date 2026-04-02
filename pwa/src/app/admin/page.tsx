'use client';

import { useState, useCallback } from 'react';
import {
  Lock, Users, ShoppingBag, Tag, AlertTriangle, BarChart3,
  Copy, Check, ExternalLink, UserPlus, RefreshCw, Save
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  escrow_status: string | null;
  customer_total: number | null;
  supplier_payout: number | null;
  platform_margin: number | null;
  created_at: string;
}

interface MarkupRate {
  id: string;
  listing_type: string;
  category: string | null;
  subcategory: string | null;
  markup_percent: number;
}

interface Dispute {
  id: string;
  order_id: string;
  initiated_by: string;
  reason: string | null;
  resolution: string | null;
  created_at: string;
}

interface SessionEntry {
  name: string;
  phone: string;
  link: string;
}

type TabId = 'users' | 'orders' | 'markups' | 'disputes' | 'stats';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "users", label: "Пользователи", icon: Users },
  { id: "orders", label: "Заказы", icon: ShoppingBag },
  { id: "markups", label: "Наценки", icon: Tag },
  { id: "disputes", label: "Споры", icon: AlertTriangle },
  { id: "stats", label: "Статистика", icon: BarChart3 },
];

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('ru-RU'); } catch { return iso; }
}

function fmtMoney(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(val) + ' ₽';
}

function truncId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

function PinGate({ onAuth }: { onAuth: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        onAuth(pin);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Неверный PIN');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-card p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Админ-панель</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Введите PIN"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-2xl tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            {loading ? 'Проверка…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UsersTab({ pin }: { pin: string }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<SessionEntry[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, name, phone }),
      });
      const data = await res.json();
      if (res.ok && data.link) {
        setResult(data.link);
        setHistory(h => [{ name, phone, link: data.link }, ...h]);
        setName('');
        setPhone('');
      } else {
        setError(data.error || 'Ошибка генерации');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-brand-500" />
          Создать пользователя
        </h2>
        <form onSubmit={handleGenerate} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Имя"
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Телефон"
            type="tel"
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            {loading ? 'Генерация…' : 'Создать ссылку'}
          </button>
        </form>
        {result && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-dark-border flex items-center gap-2">
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 break-all">{result}</span>
            <button
              onClick={() => copyLink(result)}
              className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        )}
      </div>
      {history.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-card">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">История сессии</h3>
          <div className="space-y-2">
            {history.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{e.name} • {e.phone}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.link}</p>
                </div>
                <button
                  onClick={() => copyLink(e.link)}
                  className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ pin }: { pin: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || data || []);
      } else {
        setError(data.error || 'Ошибка загрузки');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={loadOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50"
        >
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        {orders.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">Всего: {orders.length}</span>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {orders.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                {['№','Статус','Ескро','Покупатель','Исполнитель','Маржа','Дата'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border">
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number || truncId(o.id)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-border">{o.status}</span></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-border">{o.escrow_status || '—'}</span></td>
                  <td className="px-4 py-3 tabular-nums">{fmtMoney(o.customer_total)}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtMoney(o.supplier_payout)}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-brand-500">{fmtMoney(o.platform_margin)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MarkupsTab({ pin }: { pin: string }) {
  const [rates, setRates] = useState<MarkupRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRates = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/markup-rates', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setRates(data.rates || data || []); } else { setError(data.error || 'Ошибка'); }
    } catch {
      setError('Ошибка соединения');
    } finally { setLoading(false); }
  };

  const updateRate = (id: string, value: number) => {
    setRates(r => r.map(x => x.id === id ? { ...x, markup_percent: value } : x));
  };

  const saveRates = async () => {
    setError(''); setSuccess(''); setSaving(true);
    try {
      const res = await fetch('/api/admin/markup-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, rates }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess('Сохранено'); } else { setError(data.error || 'Ошибка'); }
    } catch {
      setError('Ошибка соединения');
    } finally { setSaving(false); }
  };

  const recalc = async () => {
    setError(''); setSuccess(''); setRecalculating(true);
    try {
      const res = await fetch('/api/admin/recalculate-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess('Цены пересчитаны'); } else { setError(data.error || 'Ошибка'); }
    } catch {
      setError('Ошибка соединения');
    } finally { setRecalculating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={loadRates} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        {rates.length > 0 && (
          <>
            <button onClick={saveRates} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
              <Save className="w-4 h-4" />
              Сохранить
            </button>
            <button onClick={recalc} disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
              <RefreshCw className={recalculating ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
              Пересчитать цены
            </button>
          </>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      {rates.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                {['Тип','Категория','Подкатегория','Наценка %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-dark-border">
                  <td className="px-4 py-3">{r.listing_type}</td>
                  <td className="px-4 py-3">{r.category || '—'}</td>
                  <td className="px-4 py-3">{r.subcategory || '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={r.markup_percent}
                      onChange={e => updateRate(r.id, parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 rounded-lg border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white text-center"
                      min="0" max="100" step="0.1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DisputesTab({ pin }: { pin: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDisputes = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/disputes', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setDisputes(data.disputes || data || []); } else { setError(data.error || 'Ошибка'); }
    } catch {
      setError('Ошибка соединения');
    } finally { setLoading(false); }
  };

  const resolve = async (orderId: string, resolution: string) => {
    setError(''); setSuccess(''); setActionLoading(orderId + resolution);
    try {
      const res = await fetch('/api/orders/' + orderId + '/dispute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, resolution }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess('Обновлено'); loadDisputes(); } else { setError(data.error || 'Ошибка'); }
    } catch {
      setError('Ошибка соединения');
    } finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={loadDisputes} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        {disputes.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">Всего: {disputes.length}</span>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <div className="space-y-3">
        {disputes.map(d => (
          <div key={d.id} className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">Заказ: {truncId(d.order_id)}</p>
                <p className="text-sm text-gray-900 dark:text-white">Инициатор: {d.initiated_by}</p>
                {d.reason && <p className="text-sm text-gray-600 dark:text-gray-300">Причина: {d.reason}</p>}
                <p className="text-xs text-gray-400">{fmtDate(d.created_at)}</p>
              </div>
              <span className={"px-2 py-0.5 rounded-full text-xs " + (d.resolution ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                {d.resolution || 'Ожидает'}
              </span>
            </div>
            {!d.resolution && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => resolve(d.order_id, 'refund_full')}
                  disabled={actionLoading !== null}
                  className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50"
                >
                  Возврат заказчику
                </button>
                <button
                  onClick={() => resolve(d.order_id, 'release_payment')}
                  disabled={actionLoading !== null}
                  className="px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50"
                >
                  Выплата исполнителю
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ pin }: { pin: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    if (loaded) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setOrders(data.orders || data || []); setLoaded(true); }
      else { setError(data.error || 'Ошибка'); }
    } catch {
      setError('Ошибка соединения');
    } finally { setLoading(false); }
  }, [loaded, pin]);

  const totalMargin = orders.reduce((s, o) => s + (o.platform_margin || 0), 0);
  const avgMargin = orders.length ? totalMargin / orders.length : 0;
  const disputeCount = orders.filter(o => o.escrow_status === 'dispute' || o.status === 'dispute').length;

  const stats = [
    { label: 'Сумма маржи платформы', value: fmtMoney(totalMargin) },
    { label: 'Всего заказов', value: String(orders.length) },
    { label: 'Средняя маржа', value: fmtMoney(Math.round(avgMargin)) },
    { label: 'Кол-во споров', value: String(disputeCount) },
  ];

  return (
    <div className="space-y-4">
      {!loaded && (
        <button onClick={loadStats} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить статистику
        </button>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loaded && (
        <div className="grid grid-cols-2 gap-4">
          {stats.map(st => (
            <div key={st.label} className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{st.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{st.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('users');

  if (!pin) {
    return <PinGate onAuth={setPin} />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Админ-панель</h1>
          <button
            onClick={() => setPin(null)}
            className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
          >
            Выйти
          </button>
        </div>

        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1 border-b border-gray-200 dark:border-dark-border min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer transition-all duration-150 whitespace-nowrap border-b-2 " +
                    (activeTab === tab.id
                      ? "border-brand-500 text-brand-500"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")
                  }
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {activeTab === 'users' && <UsersTab pin={pin} />}
          {activeTab === 'orders' && <OrdersTab pin={pin} />}
          {activeTab === 'markups' && <MarkupsTab pin={pin} />}
          {activeTab === 'disputes' && <DisputesTab pin={pin} />}
          {activeTab === 'stats' && <StatsTab pin={pin} />}
        </div>
      </div>
    </div>
  );
}
