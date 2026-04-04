'use client';

import { useState, useCallback } from 'react';
import {
  Lock, Users, ShoppingBag, Tag, AlertTriangle, BarChart3,
  Copy, Check, ExternalLink, UserPlus, RefreshCw, Save,
  Package, FileText, Plus, X, Camera, Upload, MessageSquare,
  Phone, Mail, Send, Contact
} from 'lucide-react';

interface Order {
  id: string;
  order_id: string;
  order_number: string | null;
  status: string;
  escrow_status: string | null;
  customer_total: number | null;
  supplier_payout: number | null;
  platform_margin: number | null;
  created_at: string;
  customer_phone: string | null;
  customer_name: string | null;
  address: string | null;
  work_date: string | null;
  people_count: number | null;
  hours: number | null;
  work_type: string | null;
  subcategory: string | null;
  customer_comment: string | null;
  preferred_contact: string | null;
  contractor_id: string | null;
  display_price: number | null;
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

interface AdminListing {
  listing_id: string;
  title: string;
  category_slug: string;
  listing_type: string;
  price: number;
  display_price: number;
  markup_percent: number;
  price_unit: string;
  is_active: boolean;
  created_at: string;
}

interface Lead {
  id: number;
  phone: string;
  work_type: string;
  city: string;
  comment: string | null;
  source: string;
  created_at: string;
}

const LISTING_CATEGORIES: Record<string, { label: string; slug: string }[]> = {
  material: [
    { label: 'Бетон', slug: 'concrete' },
    { label: 'Щебень', slug: 'gravel' },
    { label: 'Песок', slug: 'sand' },
    { label: 'Битум', slug: 'bitumen' },
    { label: 'Печное топливо', slug: 'heating-fuel' },
  ],
  equipment_rental: [
    { label: 'Экскаватор', slug: 'excavator' },
    { label: 'Бульдозер', slug: 'bulldozer' },
    { label: 'Самосвал', slug: 'dump-truck' },
    { label: 'Автокран', slug: 'crane' },
    { label: 'Погрузчик', slug: 'loader' },
    { label: 'Автобетоносмеситель', slug: 'concrete-mixer' },
    { label: 'Трал / негабарит', slug: 'flatbed' },
    { label: 'Мини-погрузчик', slug: 'mini-loader' },
    { label: 'Виброплита / вибротрамбовка', slug: 'compactor' },
    { label: 'Бензопила / кусторез', slug: 'chainsaw' },
    { label: 'Газонокосилка / триммер', slug: 'mower' },
    { label: 'Генератор', slug: 'generator' },
    { label: 'Мотобур', slug: 'auger' },
    { label: 'Бетономешалка (ручная)', slug: 'mixer-manual' },
  ],
};

const PRICE_UNITS = ['₽/м³', '₽/тонна', '₽/час', '₽/сутки', '₽/рейс', '₽/штука'];

const WORK_TYPE_LABELS: Record<string, string> = {
  labor: 'Рабочая сила',
  equipment: 'Техника',
  materials: 'Материалы',
  complex: 'Комплекс',
};

interface ExecutorResponse {
  id: number;
  order_id: string;
  name: string;
  phone: string;
  comment: string | null;
  price: number | null;
  status: string;
  created_at: string;
}

interface ContactEntry {
  id: string;
  name: string;
  phone: string;
  role: 'customer' | 'executor';
  messenger: string | null;
  email: string | null;
  telegram: string | null;
  city: string | null;
  work_type: string | null;
  comment: string | null;
  created_at: string;
  source: string;
}

type TabId = 'listings' | 'contractors' | 'leads' | 'contacts' | 'users' | 'orders' | 'responses' | 'markups' | 'disputes' | 'stats';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "listings", label: "Позиции", icon: Package },
  { id: "contractors", label: "Исполнители", icon: UserPlus },
  { id: "leads", label: "Заявки", icon: FileText },
  { id: "contacts", label: "Контакты", icon: Contact },
  { id: "responses", label: "Отклики", icon: MessageSquare },
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

interface AdminContractor {
  id: string;
  name: string;
  phone: string;
  city: string;
  specialties: string[];
  preferred_contact: string;
  about: string | null;
  source: string;
  telegram_id: string | null;
  max_id: string | null;
  email: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  verified: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
};

const CONTACT_BTNS = [
  { key: 'max', label: 'MAX', bg: 'bg-[#2787F5]', getHref: (c: AdminContractor) => `https://max.im/search?q=${c.phone}` },
  { key: 'telegram', label: 'TG', bg: 'bg-[#229ED9]', getHref: (c: AdminContractor) => c.telegram_id ? `https://t.me/${c.telegram_id}` : `https://t.me/+7${c.phone}` },
  { key: 'phone', label: 'Тел', bg: 'bg-green-500', getHref: (c: AdminContractor) => `tel:+7${c.phone}` },
  { key: 'email', label: 'Email', bg: 'bg-gray-200 !text-gray-700', getHref: (c: AdminContractor) => c.email ? `mailto:${c.email}` : '' },
];

function ContractorsTab({ pin }: { pin: string }) {
  const [contractors, setContractors] = useState<AdminContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/contractors', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) setContractors(data.contractors || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [pin]);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/contractors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ id, status }),
    });
    setContractors(cs => cs.map(c => c.id === id ? { ...c, status } : c));
  };

  const saveNotes = async (id: string, notes: string) => {
    await fetch('/api/admin/contractors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ id, admin_notes: notes }),
    });
  };

  const filtered = contractors.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.specialties.some(s => s.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> Загрузить
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        {contractors.length > 0 && <span className="text-sm text-gray-500">Всего: {contractors.length}</span>}
      </div>
      <div className="grid gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-[#6C5CE7] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{c.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500">{c.source}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{c.phone} &middot; {c.city === 'novosibirsk' ? 'Новосибирск' : 'Омск'} &middot; {fmtDate(c.created_at)}</div>
                {c.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.specialties.map(s => <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-500 font-medium">{s}</span>)}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {CONTACT_BTNS.map(btn => {
                    const href = btn.getHref(c);
                    if (!href) return null;
                    return (
                      <a key={btn.key} href={href} target="_blank" rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer transition-opacity hover:opacity-80 ${btn.bg} ${c.preferred_contact === btn.key ? 'ring-2 ring-offset-1 ring-brand-500' : ''}`}>
                        {btn.label}
                      </a>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 cursor-pointer">
                    <option value="new">new</option>
                    <option value="verified">verified</option>
                    <option value="active">active</option>
                    <option value="blocked">blocked</option>
                  </select>
                  <input defaultValue={c.admin_notes || ''} placeholder="Заметка..."
                    onBlur={e => saveNotes(c.id, e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500/30" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  priced: 'bg-amber-100 text-amber-700',
  payment_sent: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  published: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  confirming: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-green-100 text-green-700',
  done: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

function OrdersTab({ pin }: { pin: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [contractors, setContractors] = useState<AdminContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignState, setAssignState] = useState<Record<string, { price: string; cid: string }>>({});

  const loadOrders = async () => {
    setError('');
    setLoading(true);
    try {
      const [ordersRes, contractorsRes] = await Promise.all([
        fetch('/api/admin/orders', { headers: { 'x-admin-pin': pin } }),
        fetch('/api/admin/contractors', { headers: { 'x-admin-pin': pin } }),
      ]);
      const od = await ordersRes.json();
      const cd = await contractorsRes.json();
      if (ordersRes.ok) setOrders(od.orders || []);
      if (contractorsRes.ok) setContractors(cd.contractors || []);
      if (!ordersRes.ok) setError(od.error || 'Ошибка');
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const assignOrder = async (orderId: string) => {
    const st = assignState[orderId];
    if (!st?.price || !st?.cid) return;
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ display_price: Number(st.price), contractor_id: st.cid }),
      });
      setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status: 'priced', display_price: Number(st.price), contractor_id: st.cid } : o));
    } catch { /* */ }
  };

  const sendLink = async (orderId: string) => {
    try {
      await fetch(`/api/admin/orders/${orderId}/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({}),
      });
      setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status: 'payment_sent' } : o));
    } catch { /* */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={loadOrders} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> Загрузить
        </button>
        {orders.length > 0 && <span className="text-sm text-gray-500">Всего: {orders.length}</span>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="grid gap-4">
        {orders.map(o => {
          const oid = o.order_id || o.id;
          return (
            <div key={oid} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">{o.order_number || truncId(oid)}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                {o.work_type && <div>{WORK_TYPE_LABELS[o.work_type] || o.work_type}{o.subcategory ? ` / ${o.subcategory}` : ''}</div>}
                {o.customer_name && <div>{o.customer_name} &middot; {o.customer_phone}</div>}
                {!o.customer_name && o.customer_phone && <div>{o.customer_phone}</div>}
                {o.address && <div>{o.address}</div>}
                <div className="flex flex-wrap gap-3">
                  {o.work_date && <span>{o.work_date}</span>}
                  {o.people_count && <span>{o.people_count} чел.</span>}
                  {o.hours && <span>{o.hours} ч.</span>}
                </div>
                {o.customer_comment && <div className="italic text-gray-400">{o.customer_comment}</div>}
                {(o.display_price || o.customer_total) && (
                  <div className="text-base font-bold text-gray-900">{fmtMoney(o.display_price || o.customer_total)}</div>
                )}
              </div>
              {/* Contact buttons */}
              {o.customer_phone && (
                <div className="flex gap-2 mt-3">
                  <a href={`https://max.im/search?q=${o.customer_phone}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2787F5] cursor-pointer hover:opacity-80">MAX</a>
                  <a href={`https://t.me/+7${o.customer_phone}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#229ED9] cursor-pointer hover:opacity-80">TG</a>
                  <a href={`tel:+7${o.customer_phone}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-500 cursor-pointer hover:opacity-80">Тел</a>
                </div>
              )}
              {/* Assign price + contractor for pending orders */}
              {(o.status === 'pending') && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex gap-2">
                    <input type="number" placeholder="Цена клиенту"
                      value={assignState[oid]?.price || ''}
                      onChange={e => setAssignState(s => ({ ...s, [oid]: { ...s[oid], price: e.target.value, cid: s[oid]?.cid || '' } }))}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/30" />
                    <select
                      value={assignState[oid]?.cid || ''}
                      onChange={e => setAssignState(s => ({ ...s, [oid]: { ...s[oid], cid: e.target.value, price: s[oid]?.price || '' } }))}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm cursor-pointer">
                      <option value="">Исполнитель...</option>
                      {contractors.filter(c => c.status === 'active' || c.status === 'verified').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.specialties.join(', ')})</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => assignOrder(oid)}
                    disabled={!assignState[oid]?.price || !assignState[oid]?.cid}
                    className="w-full py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium cursor-pointer disabled:opacity-50 transition-colors">
                    Назначить
                  </button>
                </div>
              )}
              {/* Send payment link for priced orders */}
              {o.status === 'priced' && (
                <button onClick={() => sendLink(oid)}
                  className="mt-3 w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium cursor-pointer transition-colors">
                  Отправить ссылку на оплату
                </button>
              )}
            </div>
          );
        })}
      </div>
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

function ListingsTab({ pin }: { pin: string }) {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleUploadPhoto = async (listingId: string, file: File) => {
    setUploadingId(listingId);
    setUploadSuccess('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('pin', pin);
      fd.append('listing_id', listingId);
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setUploadSuccess(`Фото загружено: ${listingId}`);
        setTimeout(() => setUploadSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка загрузки фото');
      }
    } catch {
      setError('Ошибка загрузки фото');
    } finally {
      setUploadingId(null);
    }
  };

  const [form, setForm] = useState({
    listing_type: 'material',
    category_slug: 'concrete',
    title: '',
    price: '',
    price_unit: '₽/м³',
  });

  const loadListings = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/listings', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setListings(data.listings || []); } else { setError(data.error || 'Ошибка'); }
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, ...form, price: Number(form.price) }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ listing_type: 'material', category_slug: 'concrete', title: '', price: '', price_unit: '₽/м³' });
        loadListings();
      } else { setError(data.error || 'Ошибка создания'); }
    } catch { setError('Ошибка соединения'); }
    finally { setSaving(false); }
  };

  const cats = LISTING_CATEGORIES[form.listing_type] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={loadListings} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium cursor-pointer transition-colors duration-150">
          <Plus className="w-4 h-4" />
          Добавить
        </button>
        {listings.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">Всего: {listings.length}</span>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {uploadSuccess && <p className="text-green-600 text-sm">{uploadSuccess}</p>}

      {listings.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                {['Название', 'Категория', 'Тип', 'База', 'Витрина', 'Наценка', 'Ед.', 'Фото', 'Статус', 'Дата'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.listing_id} className="border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border">
                  <td className="px-4 py-3 max-w-[200px] truncate">{l.title}</td>
                  <td className="px-4 py-3">{l.category_slug}</td>
                  <td className="px-4 py-3">{l.listing_type === 'material' ? 'Мат.' : 'Техн.'}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtMoney(l.price)}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{fmtMoney(l.display_price)}</td>
                  <td className="px-4 py-3 tabular-nums text-brand-500">{l.markup_percent}%</td>
                  <td className="px-4 py-3 whitespace-nowrap">{l.price_unit}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 cursor-pointer transition-colors text-xs font-medium">
                      {uploadingId === l.listing_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingId === l.listing_id ? '...' : 'Фото'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadPhoto(l.listing_id, f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <span className={"px-2 py-0.5 rounded-full text-xs " + (l.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {l.is_active ? 'Актив' : 'Скрыта'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Новая позиция</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Тип</label>
                <select value={form.listing_type}
                  onChange={e => {
                    const lt = e.target.value;
                    const firstCat = LISTING_CATEGORIES[lt]?.[0]?.slug || '';
                    setForm(f => ({ ...f, listing_type: lt, category_slug: firstCat }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white">
                  <option value="material">Стройматериалы</option>
                  <option value="equipment_rental">Аренда техники</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Категория</label>
                <select value={form.category_slug}
                  onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white">
                  {cats.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Название</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Бетон М300 В22.5"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white"
                  required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Базовая цена</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="5000" min="1" step="1"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white"
                    required />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Единица</label>
                  <select value={form.price_unit} onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white">
                    {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="mt-2 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
                {saving ? 'Создание...' : 'Создать'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsTab({ pin }: { pin: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLeads = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/leads', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setLeads(data.leads || []); } else { setError(data.error || 'Ошибка'); }
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={loadLeads} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        {leads.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">Всего: {leads.length}</span>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {leads.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                {['Дата', 'Телефон', 'Категория', 'Город', 'Комментарий', 'Источник'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} className="border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  <td className="px-4 py-3 font-mono">{l.phone}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-border">
                      {WORK_TYPE_LABELS[l.work_type] || l.work_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{l.city}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-600 dark:text-gray-300">{l.comment || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{l.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function ContactsTab({ pin }: { pin: string }) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'executor'>('all');
  const [search, setSearch] = useState('');

  const loadContacts = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/contacts', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setContacts(data.contacts || []); } else { setError(data.error || 'Ошибка'); }
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  const filtered = contacts.filter((c) => {
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telegram?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const ROLE_LABELS: Record<string, string> = { customer: 'Заказчик', executor: 'Исполнитель' };
  const ROLE_COLORS: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-700',
    executor: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={loadContacts} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        {contacts.length > 0 && (
          <span className="text-sm text-gray-500">Всего: {filtered.length} из {contacts.length}</span>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону, email..."
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-1.5">
            {([['all', 'Все'], ['customer', 'Заказчики'], ['executor', 'Исполнители']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setRoleFilter(key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  roleFilter === key
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {c.name || 'Без имени'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[c.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[c.role] || c.role}
                    </span>
                    {c.work_type && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {WORK_TYPE_LABELS[c.work_type] || c.work_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                    <span className="font-mono">{c.phone}</span>
                    {c.city && <span>{c.city === 'omsk' ? 'Омск' : c.city === 'novosibirsk' ? 'Новосибирск' : c.city}</span>}
                    {c.email && <span>{c.email}</span>}
                    {c.telegram && <span>@{c.telegram.replace('@', '')}</span>}
                  </div>
                  {c.comment && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.comment}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {c.source} &middot; {fmtDate(c.created_at)}
                  </p>
                </div>

                {/* Contact action buttons */}
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                  <a href={`tel:+${c.phone}`} title="Позвонить"
                    className="w-9 h-9 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors">
                    <Phone className="w-4 h-4 text-green-700" />
                  </a>
                  {c.telegram ? (
                    <a href={`https://t.me/${c.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" title="Telegram"
                      className="w-9 h-9 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors">
                      <Send className="w-4 h-4 text-blue-700" />
                    </a>
                  ) : (
                    <a href={`https://t.me/+${c.phone}`} target="_blank" rel="noopener noreferrer" title="Telegram (по номеру)"
                      className="w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <Send className="w-4 h-4 text-blue-400" />
                    </a>
                  )}
                  {(c.messenger === 'MAX' || !c.messenger) && (
                    <a href={`https://max.ru/`} target="_blank" rel="noopener noreferrer" title="MAX"
                      className="w-9 h-9 rounded-lg bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition-colors">
                      <MessageSquare className="w-4 h-4 text-indigo-700" />
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} title="Email"
                      className="w-9 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors">
                      <Mail className="w-4 h-4 text-amber-700" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponsesTab({ pin }: { pin: string }) {
  const [responses, setResponses] = useState<ExecutorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadResponses = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/responses', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) { setResponses(data.responses || []); } else { setError(data.error || 'Ошибка'); }
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/responses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, id, status }),
      });
      if (res.ok) {
        setResponses(r => r.map(x => x.id === id ? { ...x, status } : x));
      }
    } catch { /* ignore */ }
    finally { setUpdatingId(null); }
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Ожидает',
    accepted: 'Принят',
    rejected: 'Отклонён',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={loadResponses} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Загрузить
        </button>
        {responses.length > 0 && (
          <span className="text-sm text-gray-500">Всего: {responses.length}</span>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {responses.length > 0 && (
        <div className="space-y-3">
          {responses.map(r => (
            <div key={r.id} className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-gray-900 dark:text-white">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Заказ: <span className="font-mono">{truncId(r.order_id)}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Тел: <span className="font-mono">{r.phone}</span>
                  </p>
                  {r.price != null && (
                    <p className="text-sm text-brand-500 font-semibold mt-1">Цена: {fmtMoney(r.price)}</p>
                  )}
                  {r.comment && (
                    <p className="text-sm text-gray-500 mt-1">{r.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(r.created_at)}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateStatus(r.id, 'accepted')}
                      disabled={updatingId === r.id}
                      className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {updatingId === r.id ? '...' : 'Принять'}
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'rejected')}
                      disabled={updatingId === r.id}
                      className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {updatingId === r.id ? '...' : 'Отклонить'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'listings';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const validTabs: TabId[] = ['listings', 'leads', 'contacts', 'users', 'orders', 'responses', 'markups', 'disputes', 'stats'];
  if (tab && validTabs.includes(tab as TabId)) return tab as TabId;
  return 'listings';
}

export default function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

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
          {activeTab === 'listings' && <ListingsTab pin={pin} />}
          {activeTab === 'contractors' && <ContractorsTab pin={pin} />}
          {activeTab === 'leads' && <LeadsTab pin={pin} />}
          {activeTab === 'contacts' && <ContactsTab pin={pin} />}
          {activeTab === 'responses' && <ResponsesTab pin={pin} />}
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
