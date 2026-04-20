'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock, Users, ShoppingBag, Tag, AlertTriangle, BarChart3,
  Copy, Check, ExternalLink, UserPlus, RefreshCw, Save,
  Package, FileText, Plus, X, Camera, Upload, MessageSquare,
  Phone, Mail, Send, Contact, TrendingUp, MapPin, Clipboard,
  Activity, FileDown, ArrowUpRight, ArrowDownRight, Minus,
  DollarSign, Briefcase, UserCheck, Clock, Percent, PieChart
} from 'lucide-react';

interface Order {
  id: string;
  order_id: string;
  order_number: string | null;
  status: string;
  customer_type: string | null;
  payment_status: string | null;
  executor_payout_status: string | null;
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

type TabId = 'listings' | 'contractors' | 'customers' | 'leads' | 'contacts' | 'users' | 'orders' | 'responses' | 'markups' | 'disputes' | 'crm' | 'analytics' | 'documents';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "crm", label: "CRM Воронка", icon: TrendingUp },
  { id: "analytics", label: "Аналитика", icon: Activity },
  { id: "orders", label: "Заказы", icon: ShoppingBag },
  { id: "listings", label: "Позиции", icon: Package },
  { id: "contractors", label: "Исполнители", icon: UserPlus },
  { id: "customers", label: "Заказчики", icon: Users },
  { id: "leads", label: "Заявки", icon: FileText },
  { id: "contacts", label: "Контакты", icon: Contact },
  { id: "responses", label: "Отклики", icon: MessageSquare },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "documents", label: "Документы", icon: FileDown },
  { id: "markups", label: "Наценки", icon: Tag },
  { id: "disputes", label: "Споры", icon: AlertTriangle },
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
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-4"
          >
            &larr; Главная
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Админ-панель</h1>
          </div>
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
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ name, phone }),
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
  payout_type: string | null;
  payout_sbp_phone: string | null;
  payout_bank_details: string | null;
  is_legal_entity: boolean | null;
  inn: string | null;
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
                {/* Payout requisites */}
                {c.payout_type && (
                  <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs space-y-1">
                    <span className="font-semibold text-purple-700">Реквизиты выплаты</span>
                    <div className="text-gray-600">
                      {c.payout_type === 'sbp' && <>СБП: <span className="font-medium">{c.payout_sbp_phone || c.phone}</span></>}
                      {c.payout_type === 'bank_transfer' && <span className="whitespace-pre-wrap">{c.payout_bank_details}</span>}
                      {c.payout_type === 'cash' && <span>Наличные</span>}
                    </div>
                    {c.inn && <div className="text-gray-500">ИНН: {c.inn}</div>}
                    {c.is_legal_entity && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">ИП / Организация</span>}
                  </div>
                )}
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
  in_progress: 'bg-blue-100 text-blue-700',
  confirming: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

function OrdersTab({ pin }: { pin: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [contractors, setContractors] = useState<AdminContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignState, setAssignState] = useState<Record<string, { price: string; cid: string }>>({});
  const [paymentState, setPaymentState] = useState<Record<string, { customerType: string }>>({});
  const [paymentLoading, setPaymentLoading] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

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

  const sendInvoice = async (orderId: string) => {
    const ctype = paymentState[orderId]?.customerType || 'individual';
    setPaymentLoading(s => ({ ...s, [orderId]: 'invoice' }));
    try {
      await fetch(`/api/admin/orders/${orderId}/send-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ customer_type: ctype }),
      });
      setOrders(os => os.map(o => o.order_id === orderId ? { ...o, payment_status: 'invoice_sent', customer_type: ctype } : o));
    } catch { /* */ } finally {
      setPaymentLoading(s => { const n = { ...s }; delete n[orderId]; return n; });
    }
  };

  const markPaymentReceived = async (orderId: string) => {
    setPaymentLoading(s => ({ ...s, [orderId]: 'paid' }));
    try {
      await fetch(`/api/admin/orders/${orderId}/payment-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ payment_status: 'paid' }),
      });
      setOrders(os => os.map(o => o.order_id === orderId ? { ...o, payment_status: 'paid', status: 'paid' } : o));
    } catch { /* */ } finally {
      setPaymentLoading(s => { const n = { ...s }; delete n[orderId]; return n; });
    }
  };

  const markExecutorPaid = async (orderId: string) => {
    setPaymentLoading(s => ({ ...s, [orderId]: 'payout' }));
    try {
      await fetch(`/api/admin/orders/${orderId}/payment-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ executor_payout_status: 'paid' }),
      });
      setOrders(os => os.map(o => o.order_id === orderId ? { ...o, executor_payout_status: 'paid', status: 'completed' } : o));
    } catch { /* */ } finally {
      setPaymentLoading(s => { const n = { ...s }; delete n[orderId]; return n; });
    }
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

  const changeStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
    } catch { /* */ }
  };

  const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
    paid: [{ label: 'В работу', next: 'in_progress', color: 'bg-blue-500 hover:bg-blue-600' }],
    in_progress: [
      { label: 'Исполнен', next: 'completed', color: 'bg-green-500 hover:bg-green-600' },
      { label: 'Спор', next: 'disputed', color: 'bg-red-500 hover:bg-red-600' },
    ],
    confirming: [
      { label: 'Завершён', next: 'completed', color: 'bg-green-500 hover:bg-green-600' },
      { label: 'Спор', next: 'disputed', color: 'bg-red-500 hover:bg-red-600' },
    ],
    disputed: [
      { label: 'Решено (завершён)', next: 'completed', color: 'bg-green-500 hover:bg-green-600' },
      { label: 'Отклонён', next: 'cancelled', color: 'bg-gray-500 hover:bg-gray-600' },
    ],
  };

  const saveEdit = async (orderId: string) => {
    const f = editForm;
    const updates: Record<string, unknown> = {};
    if (f.address !== undefined) updates.address = f.address;
    if (f.work_date !== undefined) updates.work_date = f.work_date;
    if (f.hours !== undefined) updates.hours = Number(f.hours) || null;
    if (f.people_count !== undefined) updates.people_count = Number(f.people_count) || null;
    if (f.customer_comment !== undefined) updates.customer_comment = f.customer_comment;
    if (f.customer_name !== undefined) updates.customer_name = f.customer_name;
    if (f.customer_phone !== undefined) updates.customer_phone = f.customer_phone;
    if (Object.keys(updates).length === 0) { setEditingOrder(null); return; }
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setOrders(os => os.map(o => (o.order_id || o.id) === orderId ? { ...o, ...updates } as Order : o));
        setEditingOrder(null);
      }
    } catch { /* */ }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').includes(q) ||
      (o.work_type || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={loadOrders} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> Загрузить
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени, телефону, адресу..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm cursor-pointer">
          <option value="">Все статусы</option>
          {['pending', 'priced', 'payment_sent', 'paid', 'in_progress', 'confirming', 'completed', 'cancelled', 'disputed'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {orders.length > 0 && <span className="text-sm text-gray-500">Показано: {filteredOrders.length} / {orders.length}</span>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="grid gap-4">
        {filteredOrders.map(o => {
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
              {/* Payment management for priced+ orders */}
              {(['priced', 'payment_sent', 'paid', 'in_progress', 'confirming'].includes(o.status)) && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="text-xs font-semibold text-amber-700 mb-1">Оплата</div>
                  {/* Customer type toggle */}
                  <div className="flex gap-2">
                    {(['individual', 'legal_entity'] as const).map(ct => (
                      <button key={ct} type="button"
                        onClick={() => setPaymentState(s => ({ ...s, [oid]: { ...s[oid], customerType: ct } }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          (paymentState[oid]?.customerType || o.customer_type || 'individual') === ct
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                        }`}>
                        {ct === 'individual' ? 'Физлицо / СБП' : 'Организация / Счёт'}
                      </button>
                    ))}
                  </div>
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      o.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      o.payment_status === 'invoice_sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>Оплата: {o.payment_status === 'paid' ? 'Получено ✓' : o.payment_status === 'invoice_sent' ? 'Счёт отправлен' : 'Ожидается'}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      o.executor_payout_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>Исполнитель: {o.executor_payout_status === 'paid' ? 'Выплачено ✓' : 'Ожидается'}</span>
                  </div>
                  {/* Action buttons */}
                  <div className="grid grid-cols-1 gap-1.5">
                    {o.payment_status !== 'paid' && (
                      <button onClick={() => sendInvoice(oid)}
                        disabled={paymentLoading[oid] === 'invoice'}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors">
                        {paymentLoading[oid] === 'invoice' ? 'Отправка...' :
                          (paymentState[oid]?.customerType || o.customer_type) === 'legal_entity'
                            ? 'Выставить счёт (ФИД)'
                            : 'Отправить реквизиты СБП'}
                      </button>
                    )}
                    {o.payment_status !== 'paid' && (
                      <button onClick={() => markPaymentReceived(oid)}
                        disabled={paymentLoading[oid] === 'paid'}
                        className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors">
                        {paymentLoading[oid] === 'paid' ? 'Сохранение...' : 'Оплата получена ✓'}
                      </button>
                    )}
                    {o.payment_status === 'paid' && o.executor_payout_status !== 'paid' && (
                      <button onClick={() => markExecutorPaid(oid)}
                        disabled={paymentLoading[oid] === 'payout'}
                        className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors">
                        {paymentLoading[oid] === 'payout' ? 'Сохранение...' : 'Выплачено исполнителю ✓'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Status transition buttons */}
              {STATUS_TRANSITIONS[o.status] && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_TRANSITIONS[o.status].map(t => (
                    <button key={t.next} onClick={() => changeStatus(oid, t.next)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer transition-colors ${t.color}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Edit button */}
              <button onClick={() => {
                if (editingOrder === oid) { setEditingOrder(null); return; }
                setEditForm({
                  address: o.address || '',
                  work_date: o.work_date || '',
                  hours: String(o.hours || ''),
                  people_count: String(o.people_count || ''),
                  customer_comment: o.customer_comment || '',
                  customer_name: o.customer_name || '',
                  customer_phone: o.customer_phone || '',
                });
                setEditingOrder(oid);
              }}
                className="mt-2 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                {editingOrder === oid ? 'Отмена' : 'Редактировать'}
              </button>
              {/* Inline edit form */}
              {editingOrder === oid && (
                <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.customer_name || ''} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))}
                      placeholder="Имя клиента" className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
                    <input value={editForm.customer_phone || ''} onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))}
                      placeholder="Телефон" className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <input value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Адрес" className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <input value={editForm.work_date || ''} onChange={e => setEditForm(f => ({ ...f, work_date: e.target.value }))}
                      placeholder="Дата работ" type="date" className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
                    <input value={editForm.hours || ''} onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                      placeholder="Часы" type="number" min="0" className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
                    <input value={editForm.people_count || ''} onChange={e => setEditForm(f => ({ ...f, people_count: e.target.value }))}
                      placeholder="Человек" type="number" min="0" className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <textarea value={editForm.customer_comment || ''} onChange={e => setEditForm(f => ({ ...f, customer_comment: e.target.value }))}
                    placeholder="Комментарий клиента" rows={2}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm resize-none" />
                  <button onClick={() => saveEdit(oid)}
                    className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium cursor-pointer transition-colors">
                    Сохранить
                  </button>
                </div>
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
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ rates }),
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
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({}),
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
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [editListingForm, setEditListingForm] = useState<{ title: string; price: string; price_unit: string }>({ title: '', price: '', price_unit: '' });

  const toggleListingActive = async (listingId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ listing_id: listingId, is_active: !currentActive }),
      });
      if (res.ok) {
        setListings(ls => ls.map(l => l.listing_id === listingId ? { ...l, is_active: !currentActive } : l));
      }
    } catch { /* */ }
  };

  const saveListingEdit = async (listingId: string) => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { listing_id: listingId };
      if (editListingForm.title) updates.title = editListingForm.title;
      if (editListingForm.price) updates.price = Number(editListingForm.price);
      if (editListingForm.price_unit) updates.price_unit = editListingForm.price_unit;
      const res = await fetch('/api/admin/listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setEditingListing(null);
        loadListings();
      }
    } catch { /* */ } finally { setSaving(false); }
  };

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
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
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
                {['Название', 'Категория', 'Тип', 'База', 'Витрина', 'Наценка', 'Ед.', 'Фото', 'Статус', 'Дата', 'Действия'].map(h => (
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
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => toggleListingActive(l.listing_id, l.is_active)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${l.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}>
                        {l.is_active ? 'Скрыть' : 'Активировать'}
                      </button>
                      <button onClick={() => {
                        if (editingListing === l.listing_id) { setEditingListing(null); return; }
                        setEditListingForm({ title: l.title, price: String(l.price), price_unit: l.price_unit });
                        setEditingListing(l.listing_id);
                      }}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer transition-colors">
                        Ред.
                      </button>
                    </div>
                    {editingListing === l.listing_id && (
                      <div className="mt-2 space-y-1.5 min-w-[250px]">
                        <input value={editListingForm.title} onChange={e => setEditListingForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Название" className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs" />
                        <input value={editListingForm.price} onChange={e => setEditListingForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="Базовая цена" type="number" className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs" />
                        <button onClick={() => saveListingEdit(l.listing_id)} disabled={saving}
                          className="w-full py-1 rounded-lg bg-blue-500 text-white text-xs font-medium cursor-pointer hover:bg-blue-600 disabled:opacity-50 transition-colors">
                          {saving ? '...' : 'Сохранить'}
                        </button>
                      </div>
                    )}
                  </td>
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

interface CustomerAccount {
  id: string;
  phone: string;
  name: string;
  customer_type: 'personal' | 'business';
  org_name: string | null;
  inn: string | null;
  city: string | null;
  preferred_contact: string | null;
  admin_notes: string | null;
  created_at: string;
}

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  personal: 'Частное лицо',
  business: 'Бизнес / ИП',
};

function CustomersTab({ pin }: { pin: string }) {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'business'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) setCustomers(data.customers || []);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  const saveNotes = async (id: string, notes: string) => {
    await fetch('/api/admin/customers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ id, admin_notes: notes }),
    });
  };

  const filtered = customers.filter(c => {
    if (typeFilter !== 'all' && c.customer_type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.org_name?.toLowerCase().includes(q)) ||
      (c.inn?.includes(q))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50">
          <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> Загрузить
        </button>
        {customers.length > 0 && <span className="text-sm text-gray-500">Всего: {filtered.length} из {customers.length}</span>}
      </div>

      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени, телефону, ИНН..."
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex gap-1.5">
            {([['all', 'Все'], ['personal', 'Частные'], ['business', 'Бизнес']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTypeFilter(key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${typeFilter === key ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2F5BFF] to-[#2d35a8] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.customer_type === 'business' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {CUSTOMER_TYPE_LABELS[c.customer_type] || c.customer_type}
                  </span>
                </div>
                {c.org_name && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {c.org_name}{c.inn && <span className="text-gray-400"> · ИНН {c.inn}</span>}
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                  <a href={`tel:+7${c.phone}`} className="flex items-center gap-1 hover:text-brand-500 transition-colors">
                    <Phone className="w-3 h-3" />
                    +7 {c.phone.replace(/^7/, '').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2-$3-$4')}
                  </a>
                  {c.city && <span>{c.city === 'omsk' ? 'Омск' : c.city === 'novosibirsk' ? 'Новосибирск' : c.city}</span>}
                  <span>{fmtDate(c.created_at)}</span>
                </div>
                <div className="mt-3">
                  <input defaultValue={c.admin_notes || ''} placeholder="Заметка..."
                    onBlur={e => saveNotes(c.id, e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500/30" />
                </div>
              </div>
            </div>
          </div>
        ))}
        {customers.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Нет результатов</p>
        )}
      </div>
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
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, status }),
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

// === CRM LEAD FUNNEL STAGES ===
const LEAD_STAGE_LABELS: Record<string, string> = {
  new: 'Новая',
  contacted: 'Контактировали',
  engaged: 'Взаимодействие',
  link_sent: 'Ссылка отправлена',
  converted: '✅ Конвертирован',
  cold: '🧊 Холодный',
  lost: '❌ Потерян',
};
const LEAD_STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  engaged: 'bg-indigo-100 text-indigo-700',
  link_sent: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  cold: 'bg-slate-100 text-slate-500',
  lost: 'bg-red-100 text-red-600',
};
const PROSPECT_STAGE_LABELS: Record<string, string> = {
  new: 'Новый',
  messaged: 'Написали',
  replied: 'Ответил',
  contact_collected: 'Контакт получен',
  invite_sent: '📲 Инвайт отправлен',
  registered: '✅ Зарегистрирован',
  active: '🏆 Активен',
  lost: '❌ Потерян',
  blocked: '🚫 Заблокирован',
};
const PROSPECT_STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  messaged: 'bg-blue-100 text-blue-700',
  replied: 'bg-indigo-100 text-indigo-700',
  contact_collected: 'bg-amber-100 text-amber-700',
  invite_sent: 'bg-orange-100 text-orange-700',
  registered: 'bg-green-100 text-green-700',
  active: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-600',
  blocked: 'bg-gray-200 text-gray-500',
};

interface CrmLead {
  id: number;
  phone: string;
  name?: string;
  work_type?: string;
  city?: string;
  messenger?: string;
  email?: string;
  telegram?: string;
  stage: string;
  contact_attempts: number;
  last_contacted_at?: string;
  next_followup_at?: string;
  converted_at?: string;
  order_id?: string;
  admin_notes?: string;
  conversation_summary?: string;
  created_at: string;
}

interface CrmProspect {
  id: number;
  name: string;
  phone?: string;
  city: string;
  specialties: string[];
  source: string;
  avito_profile_url?: string;
  stage: string;
  contact_attempts: number;
  last_contacted_at?: string;
  next_followup_at?: string;
  registered_at?: string;
  first_order_at?: string;
  contractor_id?: string;
  admin_notes?: string;
  avito_message_draft?: string;
  max_id?: string;
  telegram_id?: string;
  email?: string;
  created_at: string;
}

interface CrmStats {
  totalLeads: number;
  convertedLeads: number;
  totalProspects: number;
  registeredProspects: number;
  activeProspects: number;
}

const SPECIALTIES_OPTIONS = [
  'Разнорабочие', 'Демонтаж', 'Малярные работы', 'Электрика', 'Сантехника',
  'Плитка', 'Полы', 'Плотник', 'Кровля', 'Благоустройство', 'Бетонные работы',
];

function CrmFunnelTab({ pin }: { pin: string }) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [prospects, setProspects] = useState<CrmProspect[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingError, setSavingError] = useState('');
  const [activeSection, setActiveSection] = useState<'customers' | 'executors' | 'add'>('customers');
  const [filterStage, setFilterStage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);

  const [newProspect, setNewProspect] = useState({
    name: '', phone: '', city: 'omsk', avito_profile_url: '', specialties: [] as string[], admin_notes: '',
  });
  const [addingProspect, setAddingProspect] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/funnel', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setProspects(data.prospects || []);
        setStats(data.stats || null);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  const updateLeadStage = async (id: number, stage: string) => {
    const prev = leads.find(l => l.id === id);
    setLeads(ls => ls.map(l => l.id === id ? { ...l, stage } : l));
    try {
      const res = await fetch('/api/admin/crm/funnel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ type: 'lead', id, stage }),
      });
      if (!res.ok) {
        if (prev) setLeads(ls => ls.map(l => l.id === id ? prev : l));
        setSavingError('Не удалось сохранить этап лида');
        setTimeout(() => setSavingError(''), 4000);
      }
    } catch {
      if (prev) setLeads(ls => ls.map(l => l.id === id ? prev : l));
      setSavingError('Ошибка соединения');
      setTimeout(() => setSavingError(''), 4000);
    }
  };

  const updateLeadNotes = async (id: number, notes: string) => {
    try {
      const res = await fetch('/api/admin/crm/funnel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ type: 'lead', id, admin_notes: notes }),
      });
      if (!res.ok) {
        setSavingError('Не удалось сохранить заметку');
        setTimeout(() => setSavingError(''), 4000);
      }
    } catch {
      setSavingError('Ошибка соединения');
      setTimeout(() => setSavingError(''), 4000);
    }
  };

  const updateProspectStage = async (id: number, stage: string) => {
    const prev = prospects.find(p => p.id === id);
    setProspects(ps => ps.map(p => p.id === id ? { ...p, stage } : p));
    try {
      const res = await fetch('/api/admin/crm/prospects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, stage }),
      });
      if (!res.ok) {
        if (prev) setProspects(ps => ps.map(p => p.id === id ? prev : p));
        setSavingError('Не удалось сохранить этап проспекта');
        setTimeout(() => setSavingError(''), 4000);
      }
    } catch {
      if (prev) setProspects(ps => ps.map(p => p.id === id ? prev : p));
      setSavingError('Ошибка соединения');
      setTimeout(() => setSavingError(''), 4000);
    }
  };

  const updateProspectNotes = async (id: number, notes: string) => {
    try {
      const res = await fetch('/api/admin/crm/prospects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, admin_notes: notes }),
      });
      if (!res.ok) {
        setSavingError('Не удалось сохранить заметку');
        setTimeout(() => setSavingError(''), 4000);
      }
    } catch {
      setSavingError('Ошибка соединения');
      setTimeout(() => setSavingError(''), 4000);
    }
  };

  const snoozeItem = async (type: 'lead' | 'prospect', id: number) => {
    const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (type === 'lead') {
      const prev = leads.find(l => l.id === id);
      setLeads(ls => ls.map(l => l.id === id ? { ...l, next_followup_at: snoozeUntil } : l));
      const res = await fetch('/api/admin/crm/funnel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ type: 'lead', id, next_followup_at: snoozeUntil }),
      });
      if (!res.ok && prev) setLeads(ls => ls.map(l => l.id === id ? prev : l));
    } else {
      const prev = prospects.find(p => p.id === id);
      setProspects(ps => ps.map(p => p.id === id ? { ...p, next_followup_at: snoozeUntil } : p));
      const res = await fetch('/api/admin/crm/prospects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, next_followup_at: snoozeUntil }),
      });
      if (!res.ok && prev) setProspects(ps => ps.map(p => p.id === id ? prev : p));
    }
  };

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(''); setAddSuccess(''); setAddingProspect(true);
    try {
      const res = await fetch('/api/admin/crm/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(newProspect),
      });
      const data = await res.json();
      if (res.ok) {
        setAddSuccess('Проспект добавлен!');
        setNewProspect({ name: '', phone: '', city: 'omsk', avito_profile_url: '', specialties: [], admin_notes: '' });
        load();
      } else { setAddError(data.error || 'Ошибка'); }
    } catch { setAddError('Ошибка соединения'); }
    finally { setAddingProspect(false); }
  };

  const toggleSpecialty = (s: string) => {
    setNewProspect(p => ({
      ...p,
      specialties: p.specialties.includes(s) ? p.specialties.filter(x => x !== s) : [...p.specialties, s],
    }));
  };

  const now = new Date();
  const overdueLeads = leads.filter(l =>
    l.next_followup_at && new Date(l.next_followup_at) <= now && !['converted', 'lost', 'cold'].includes(l.stage)
  );
  const overdueProspects = prospects.filter(p =>
    p.next_followup_at && new Date(p.next_followup_at) <= now && !['registered', 'active', 'lost', 'blocked'].includes(p.stage)
  );

  const q = searchQuery.trim().toLowerCase();
  const filteredLeads = leads
    .filter(l => !filterStage || l.stage === filterStage)
    .filter(l => !q || l.phone.includes(q) || (l.name || '').toLowerCase().includes(q));
  const filteredProspects = prospects
    .filter(p => !filterStage || p.stage === filterStage)
    .filter(p => !q || (p.phone || '').includes(q) || p.name.toLowerCase().includes(q));

  const convRate = stats && stats.totalLeads > 0
    ? Math.round((stats.convertedLeads / stats.totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Лидов всего', val: stats.totalLeads, color: 'text-gray-900' },
            { label: 'Конвертировано', val: stats.convertedLeads, color: 'text-green-600' },
            { label: 'Конверсия', val: convRate + '%', color: 'text-brand-500' },
            { label: 'Просроч. лиды', val: overdueLeads.length, color: overdueLeads.length > 0 ? 'text-red-500' : 'text-gray-400' },
            { label: 'Проспектов', val: stats.totalProspects, color: 'text-gray-900' },
            { label: 'Зарегистрировано', val: stats.registeredProspects, color: 'text-emerald-600' },
            { label: 'Просроч. проспекты', val: overdueProspects.length, color: overdueProspects.length > 0 ? 'text-red-500' : 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-card text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {savingError && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {savingError}
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'customers', label: '📋 Заказчики (лиды)' },
          { id: 'executors', label: '👷 Исполнители (Авито)' },
          { id: 'add', label: '➕ Добавить проспекта' },
        ].map(s => (
          <button key={s.id}
            onClick={() => { setActiveSection(s.id as typeof activeSection); setFilterStage(''); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
              activeSection === s.id
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s.label}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-50">
          <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          Обновить
        </button>
      </div>

      {/* Search + Stage filter */}
      {activeSection !== 'add' && (
        <div className="space-y-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterStage('')}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${!filterStage ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Все
            </button>
            {(activeSection === 'customers'
              ? Object.keys(LEAD_STAGE_LABELS)
              : Object.keys(PROSPECT_STAGE_LABELS)
            ).map(stage => (
              <button key={stage} onClick={() => setFilterStage(stage)}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  filterStage === stage ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {activeSection === 'customers' ? LEAD_STAGE_LABELS[stage] : PROSPECT_STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOMERS PIPELINE */}
      {activeSection === 'customers' && (
        <div className="space-y-3">
          {filteredLeads.length === 0 && !loading && (
            <p className="text-gray-400 text-sm text-center py-8">
              {searchQuery || filterStage ? 'Ничего не найдено.' : 'Нет лидов в воронке. Они появятся автоматически при заполнении формы на лендинге.'}
            </p>
          )}
          {filteredLeads.map(l => {
            const isOverdue = !!l.next_followup_at && new Date(l.next_followup_at) <= now;
            const hasSummary = !!l.conversation_summary;
            return (
              <div key={l.id} className={`bg-white rounded-2xl p-4 shadow-card border ${isOverdue ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{l.name || l.phone}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STAGE_COLORS[l.stage] || 'bg-gray-100'}`}>
                        {LEAD_STAGE_LABELS[l.stage] || l.stage}
                      </span>
                      {l.messenger && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{l.messenger}</span>}
                      {isOverdue && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-semibold">⚠ просрочено</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      {l.name && <span>{l.phone} · </span>}
                      {WORK_TYPE_LABELS[l.work_type || ''] || l.work_type}
                      {l.city && ` · ${l.city === 'novosibirsk' ? 'Новосибирск' : 'Омск'}`}
                    </div>
                    {l.last_contacted_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        Последний контакт: {fmtDate(l.last_contacted_at)} · Попытки: {l.contact_attempts}
                      </div>
                    )}
                    {l.next_followup_at && (
                      <div className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-blue-500'}`}>
                        Следующий контакт: {fmtDate(l.next_followup_at)}
                      </div>
                    )}
                    {hasSummary && (
                      <button
                        onClick={() => setExpandedSummary(expandedSummary === l.id ? null : l.id)}
                        className="mt-1.5 text-xs text-brand-500 hover:underline cursor-pointer">
                        {expandedSummary === l.id ? '▲ Скрыть историю' : '▼ История переписки'}
                      </button>
                    )}
                    {expandedSummary === l.id && l.conversation_summary && (
                      <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {l.conversation_summary}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-1 flex-wrap justify-end">
                      <a href={`https://max.im/search?q=${l.phone}`} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-[#2787F5] hover:opacity-80">MAX</a>
                      <a href={l.telegram ? `https://t.me/${l.telegram}` : `https://t.me/+7${l.phone}`} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-[#229ED9] hover:opacity-80">TG</a>
                      {l.email && <a href={`mailto:${l.email}`}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Email</a>}
                      {isOverdue && (
                        <button onClick={() => snoozeItem('lead', l.id)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 cursor-pointer">
                          +24ч
                        </button>
                      )}
                    </div>
                    <select value={l.stage} onChange={e => updateLeadStage(l.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 cursor-pointer">
                      {Object.keys(LEAD_STAGE_LABELS).map(s => <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
                <input defaultValue={l.admin_notes || ''} placeholder="Заметка менеджера..."
                  onBlur={e => updateLeadNotes(l.id, e.target.value)}
                  className="mt-2 w-full text-xs px-2 py-1.5 rounded-lg border border-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500/30 text-gray-600" />
              </div>
            );
          })}
        </div>
      )}

      {/* EXECUTORS PIPELINE */}
      {activeSection === 'executors' && (
        <div className="space-y-3">
          {filteredProspects.length === 0 && !loading && (
            <p className="text-gray-400 text-sm text-center py-8">
              {searchQuery || filterStage ? 'Ничего не найдено.' : 'Нет проспектов. Добавьте кандидатов с Авито через вкладку «Добавить проспекта».'}
            </p>
          )}
          {filteredProspects.map(p => {
            const isOverdue = !!p.next_followup_at && new Date(p.next_followup_at) <= now;
            return (
              <div key={p.id} className={`bg-white rounded-2xl p-4 shadow-card border ${isOverdue ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{p.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROSPECT_STAGE_COLORS[p.stage] || 'bg-gray-100'}`}>
                        {PROSPECT_STAGE_LABELS[p.stage] || p.stage}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600">{p.source}</span>
                      {isOverdue && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-semibold">⚠ просрочено</span>}
                    </div>
                    {p.phone && <div className="text-sm text-gray-500">{p.phone} · {p.city === 'novosibirsk' ? 'Новосибирск' : 'Омск'}</div>}
                    {p.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.specialties.map(s => <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-brand-500/10 text-brand-600">{s}</span>)}
                      </div>
                    )}
                    {p.last_contacted_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        Контакт: {fmtDate(p.last_contacted_at)} · Попытки: {p.contact_attempts}
                      </div>
                    )}
                    {p.next_followup_at && (
                      <div className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-blue-500'}`}>
                        Следующий контакт: {fmtDate(p.next_followup_at)}
                      </div>
                    )}
                    {p.registered_at && <div className="text-xs text-green-600 mt-1">✅ Зарегистрирован: {fmtDate(p.registered_at)}</div>}
                    {p.first_order_at && <div className="text-xs text-emerald-600">🏆 Первый заказ: {fmtDate(p.first_order_at)}</div>}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-1 flex-wrap justify-end">
                      {p.avito_profile_url && (
                        <a href={p.avito_profile_url} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-[#00AEFF] hover:opacity-80">Авито</a>
                      )}
                      {p.phone && <>
                        <a href={`https://max.im/search?q=${p.phone}`} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-[#2787F5] hover:opacity-80">MAX</a>
                        <a href={`tel:+7${p.phone}`} className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-green-500 hover:opacity-80">Тел</a>
                      </>}
                      {isOverdue && (
                        <button onClick={() => snoozeItem('prospect', p.id)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 cursor-pointer">
                          +24ч
                        </button>
                      )}
                    </div>
                    <select value={p.stage} onChange={e => updateProspectStage(p.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 cursor-pointer">
                      {Object.keys(PROSPECT_STAGE_LABELS).map(s => <option key={s} value={s}>{PROSPECT_STAGE_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
                {p.avito_message_draft && (
                  <div className="mt-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                    <p className="text-xs text-orange-700 font-medium mb-1">Текст для Авито:</p>
                    <p className="text-xs text-orange-900 whitespace-pre-wrap">{p.avito_message_draft}</p>
                  </div>
                )}
                <input defaultValue={p.admin_notes || ''} placeholder="Заметка менеджера..."
                  onBlur={e => updateProspectNotes(p.id, e.target.value)}
                  className="mt-2 w-full text-xs px-2 py-1.5 rounded-lg border border-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500/30 text-gray-600" />
              </div>
            );
          })}
        </div>
      )}

      {/* ADD PROSPECT FORM */}
      {activeSection === 'add' && (
        <div className="bg-white rounded-2xl p-6 shadow-card max-w-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Добавить проспекта с Авито</h3>
          <form onSubmit={handleAddProspect} className="space-y-3">
            <input value={newProspect.name} onChange={e => setNewProspect(p => ({ ...p, name: e.target.value }))}
              placeholder="Имя (обязательно)" required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <input value={newProspect.phone} onChange={e => setNewProspect(p => ({ ...p, phone: e.target.value }))}
              placeholder="Телефон (если известен)" type="tel"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <input value={newProspect.avito_profile_url} onChange={e => setNewProspect(p => ({ ...p, avito_profile_url: e.target.value }))}
              placeholder="Ссылка на профиль Авито"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <select value={newProspect.city} onChange={e => setNewProspect(p => ({ ...p, city: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm cursor-pointer">
              <option value="omsk">Омск</option>
              <option value="novosibirsk">Новосибирск</option>
            </select>
            <div>
              <p className="text-xs text-gray-500 mb-2">Специализация:</p>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      newProspect.specialties.includes(s)
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={newProspect.admin_notes} onChange={e => setNewProspect(p => ({ ...p, admin_notes: e.target.value }))}
              placeholder="Заметки / комментарий"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" rows={2} />
            {addError && <p className="text-red-500 text-sm">{addError}</p>}
            {addSuccess && <p className="text-green-600 text-sm">{addSuccess}</p>}
            <button type="submit" disabled={addingProspect}
              className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors disabled:opacity-50">
              {addingProspect ? 'Добавление...' : 'Добавить проспекта'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// === ANALYTICS DASHBOARD ===
interface AnalyticsData {
  kpi: {
    totalRevenue: number;
    periodRevenue: number;
    periodGMV: number;
    totalOrders: number;
    periodOrders: number;
    paidOrdersCount: number;
    completedOrdersCount: number;
    avgOrderValue: number;
    avgMargin: number;
    totalContractors: number;
    activeContractors: number;
    totalCustomers: number;
    businessCustomers: number;
    totalLeads: number;
    totalResponses: number;
    acceptedResponses: number;
    responseRate: number;
    totalDisputes: number;
    resolvedDisputes: number;
  };
  charts: {
    statusCounts: { status: string; count: number }[];
    paymentCounts: { payment_status: string; count: number }[];
    byWorkType: { work_type: string; count: number; revenue: number }[];
    dailyOrders: { date: string; count: number }[];
    dailyRevenue: { date: string; revenue: number }[];
    leadsBySource: { source: string; count: number }[];
    contractorStatuses: { status: string; count: number }[];
  };
  topCustomers: { name: string; phone: string; orders: number; total_spent: number }[];
  topContractors: { name: string; orders: number; total_earned: number }[];
}

function KpiCard({ label, value, subValue, icon: Icon, color, trend }: {
  label: string; value: string; subValue?: string; icon: React.ElementType; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card border border-gray-100 dark:border-dark-border">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : trend === 'down' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
      {subValue && <div className="text-xs text-gray-400 mt-0.5">{subValue}</div>}
    </div>
  );
}

function MiniBarChart({ data, labelKey, valueKey, color }: {
  data: { [key: string]: string | number }[]; labelKey: string; valueKey: string; color: string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 w-28 truncate">{String(item[labelKey])}</span>
          <div className="flex-1 h-5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color}`}
              style={{ width: `${Math.max((Number(item[valueKey]) / max) * 100, 2)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">{Number(item[valueKey]).toLocaleString('ru-RU')}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab({ pin }: { pin: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`, { headers: { 'x-admin-pin': pin } });
      const d = await res.json();
      if (res.ok) setData(d);
      else setError(d.error || 'Ошибка загрузки');
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  }, [pin, period]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  );

  if (!data) return (
    <div className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors duration-150">
        <RefreshCw className="w-4 h-4" /> Загрузить аналитику
      </button>
    </div>
  );

  const { kpi, charts, topCustomers, topContractors } = data;

  return (
    <div className="space-y-6">
      {/* Period selector + refresh */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                period === d ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {d} дн.
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer disabled:opacity-50">
          <RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> Обновить
        </button>
        <button onClick={() => {
          if (!data) return;
          const { kpi: k, charts: c, topCustomers: tc, topContractors: tcon } = data;
          const rows = [
            ['=== KPI ==='],
            ['Метрика', 'Значение'],
            ['Выручка за период', String(k.periodRevenue)],
            ['Выручка всего', String(k.totalRevenue)],
            ['GMV за период', String(k.periodGMV)],
            ['Заказов за период', String(k.periodOrders)],
            ['Всего заказов', String(k.totalOrders)],
            ['Оплаченных', String(k.paidOrdersCount)],
            ['Завершённых', String(k.completedOrdersCount)],
            ['Средний чек', String(k.avgOrderValue)],
            ['Средняя маржа', String(k.avgMargin)],
            ['Исполнителей', String(k.totalContractors)],
            ['Активных исп.', String(k.activeContractors)],
            ['Заказчиков', String(k.totalCustomers)],
            ['Бизнес-клиентов', String(k.businessCustomers)],
            ['Заявок', String(k.totalLeads)],
            ['Откликов', String(k.totalResponses)],
            ['Принято откликов', String(k.acceptedResponses)],
            ['Споров', String(k.totalDisputes)],
            ['Решённых споров', String(k.resolvedDisputes)],
            [],
            ['=== Заказы по статусам ==='],
            ['Статус', 'Количество'],
            ...c.statusCounts.map(s => [s.status, String(s.count)]),
            [],
            ['=== По типам работ ==='],
            ['Тип работ', 'Количество', 'Выручка'],
            ...c.byWorkType.map(s => [s.work_type, String(s.count), String(s.revenue)]),
            [],
            ['=== Топ заказчики ==='],
            ['Имя', 'Телефон', 'Заказов', 'Потрачено'],
            ...tc.map(c => [c.name, c.phone, String(c.orders), String(c.total_spent)]),
            [],
            ['=== Топ исполнители ==='],
            ['Имя', 'Заказов', 'Заработано'],
            ...tcon.map(c => [c.name, String(c.orders), String(c.total_earned)]),
          ];
          const csv = rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n');
          const bom = '\uFEFF';
          const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `analytics-${period}d-${new Date().toISOString().slice(0,10)}.csv`;
          a.click(); URL.revokeObjectURL(url);
        }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer">
          <FileDown className="w-3.5 h-3.5" /> CSV
        </button>
        {error && <span className="text-red-500 text-xs">{error}</span>}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} color="bg-gradient-to-br from-green-500 to-emerald-600" label={`Выручка (${period} дн.)`} value={fmtMoney(kpi.periodRevenue)} subValue={`Всего: ${fmtMoney(kpi.totalRevenue)}`} trend={kpi.periodRevenue > 0 ? 'up' : 'neutral'} />
        <KpiCard icon={ShoppingBag} color="bg-gradient-to-br from-blue-500 to-indigo-600" label={`Заказов (${period} дн.)`} value={String(kpi.periodOrders)} subValue={`Всего: ${kpi.totalOrders} · Оплачено: ${kpi.paidOrdersCount}`} />
        <KpiCard icon={Percent} color="bg-gradient-to-br from-purple-500 to-violet-600" label="Средняя маржа" value={fmtMoney(Math.round(kpi.avgMargin))} subValue={`Средний чек: ${fmtMoney(Math.round(kpi.avgOrderValue))}`} />
        <KpiCard icon={Briefcase} color="bg-gradient-to-br from-amber-500 to-orange-600" label={`GMV (${period} дн.)`} value={fmtMoney(kpi.periodGMV)} />
        <KpiCard icon={UserPlus} color="bg-gradient-to-br from-cyan-500 to-teal-600" label="Исполнители" value={String(kpi.totalContractors)} subValue={`Активных: ${kpi.activeContractors}`} />
        <KpiCard icon={Users} color="bg-gradient-to-br from-indigo-500 to-blue-600" label="Заказчики" value={String(kpi.totalCustomers)} subValue={`Бизнес: ${kpi.businessCustomers}`} />
        <KpiCard icon={FileText} color="bg-gradient-to-br from-rose-500 to-pink-600" label="Заявки / Отклики" value={`${kpi.totalLeads} / ${kpi.totalResponses}`} subValue={`Принято: ${kpi.acceptedResponses} (${kpi.responseRate}%)`} />
        <KpiCard icon={AlertTriangle} color="bg-gradient-to-br from-red-500 to-rose-600" label="Споры" value={String(kpi.totalDisputes)} subValue={`Решено: ${kpi.resolvedDisputes}`} trend={kpi.totalDisputes > 0 ? 'down' : 'neutral'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Заказы по статусам</h3>
          <MiniBarChart data={charts.statusCounts.map(s => ({ ...s, label: s.status }))} labelKey="status" valueKey="count" color="bg-brand-500" />
        </div>

        {/* Payment distribution */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Статусы оплаты</h3>
          <MiniBarChart data={charts.paymentCounts.map(s => ({ ...s, label: s.payment_status || 'pending' }))} labelKey="label" valueKey="count" color="bg-green-500" />
        </div>

        {/* Work type revenue */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Выручка по типам работ</h3>
          <MiniBarChart data={charts.byWorkType.map(s => ({ ...s, label: WORK_TYPE_LABELS[s.work_type] || s.work_type || 'Другое' }))} labelKey="label" valueKey="revenue" color="bg-purple-500" />
        </div>

        {/* Leads by source */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Заявки по источникам</h3>
          <MiniBarChart data={charts.leadsBySource} labelKey="source" valueKey="count" color="bg-amber-500" />
        </div>

        {/* Contractor statuses */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Исполнители по статусам</h3>
          <MiniBarChart data={charts.contractorStatuses} labelKey="status" valueKey="count" color="bg-teal-500" />
        </div>

        {/* Daily orders sparkline */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Заказы по дням</h3>
          {charts.dailyOrders.length > 0 ? (
            <div className="flex items-end gap-1 h-24">
              {charts.dailyOrders.slice(-30).map((d, i) => {
                const max = Math.max(...charts.dailyOrders.map(x => x.count), 1);
                const h = Math.max((d.count / max) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full bg-brand-500/80 rounded-t-sm transition-all hover:bg-brand-500" style={{ height: `${h}%` }} />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">{d.date}: {d.count}</div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-gray-400 text-sm">Нет данных</p>}
        </div>
      </div>

      {/* Top customers & contractors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Топ заказчики</h3>
          <div className="space-y-3">
            {topCustomers.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone} · {c.orders} заказ(ов)</p>
                </div>
                <span className="text-sm font-bold text-green-600">{fmtMoney(c.total_spent)}</span>
              </div>
            ))}
            {topCustomers.length === 0 && <p className="text-gray-400 text-sm">Нет данных</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Топ исполнители</h3>
          <div className="space-y-3">
            {topContractors.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.orders} заказ(ов)</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">{fmtMoney(c.total_earned)}</span>
              </div>
            ))}
            {topContractors.length === 0 && <p className="text-gray-400 text-sm">Нет данных</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// === DOCUMENTS GENERATION ===
const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Счёт на оплату',
  act: 'Акт выполненных работ',
  upd: 'УПД (универсальный передаточный документ)',
  nakladnaya: 'Товарная накладная',
};

function DocumentsTab({ pin }: { pin: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>('invoice');
  const [companyOverride, setCompanyOverride] = useState({ company_name: '', inn: '', kpp: '', address: '' });
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  const loadOrders = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { headers: { 'x-admin-pin': pin } });
      const d = await res.json();
      if (res.ok) setOrders(d.orders || []);
      else setError(d.error || 'Ошибка');
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  const generateDoc = async (orderId: string) => {
    setGeneratingId(orderId);
    try {
      const body: Record<string, string> = { order_id: orderId, doc_type: docType };
      if (showCompanyForm) {
        if (companyOverride.company_name) body.company_name = companyOverride.company_name;
        if (companyOverride.inn) body.inn = companyOverride.inn;
        if (companyOverride.kpp) body.kpp = companyOverride.kpp;
        if (companyOverride.address) body.address = companyOverride.address;
      }
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const html = await res.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Ошибка генерации');
      }
    } catch { setError('Ошибка соединения'); }
    finally { setGeneratingId(null); }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').includes(q) ||
      (o.work_type || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-brand-500" />
          Генерация документов
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Тип документа</label>
            <select value={docType} onChange={e => setDocType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={() => setShowCompanyForm(!showCompanyForm)}
            className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${showCompanyForm ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {showCompanyForm ? 'Скрыть реквизиты' : 'Указать реквизиты покупателя'}
          </button>
          <button onClick={loadOrders} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer transition-colors disabled:opacity-50">
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> Загрузить заказы
          </button>
        </div>
        {showCompanyForm && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={companyOverride.company_name} onChange={e => setCompanyOverride(s => ({ ...s, company_name: e.target.value }))}
              placeholder="Наименование организации" className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            <input value={companyOverride.inn} onChange={e => setCompanyOverride(s => ({ ...s, inn: e.target.value }))}
              placeholder="ИНН" className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            <input value={companyOverride.kpp} onChange={e => setCompanyOverride(s => ({ ...s, kpp: e.target.value }))}
              placeholder="КПП" className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            <input value={companyOverride.address} onChange={e => setCompanyOverride(s => ({ ...s, address: e.target.value }))}
              placeholder="Юридический адрес" className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Search */}
      {orders.length > 0 && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по номеру, имени, телефону..."
          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
      )}

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.map(o => {
          const oid = o.order_id || o.id;
          return (
            <div key={oid} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{o.order_number || truncId(oid)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                  {o.payment_status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {o.payment_status === 'paid' ? 'Оплачен' : o.payment_status === 'invoice_sent' ? 'Счёт отправлен' : 'Не оплачен'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {o.customer_name || o.customer_phone || '—'} · {WORK_TYPE_LABELS[o.work_type || ''] || o.work_type} · {fmtMoney(o.display_price || o.customer_total)}
                </div>
              </div>
              <button onClick={() => generateDoc(oid)} disabled={generatingId === oid}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium cursor-pointer transition-colors disabled:opacity-50 flex-shrink-0">
                {generatingId === oid ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {DOC_TYPE_LABELS[docType]?.split(' ')[0] || 'Документ'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'listings';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const validTabs: TabId[] = ['listings', 'contractors', 'customers', 'leads', 'contacts', 'users', 'orders', 'responses', 'markups', 'disputes', 'crm', 'analytics', 'documents'];
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
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            &larr; Главная
          </Link>
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
          {activeTab === 'crm' && <CrmFunnelTab pin={pin} />}
          {activeTab === 'analytics' && <AnalyticsTab pin={pin} />}
          {activeTab === 'listings' && <ListingsTab pin={pin} />}
          {activeTab === 'contractors' && <ContractorsTab pin={pin} />}
          {activeTab === 'customers' && <CustomersTab pin={pin} />}
          {activeTab === 'leads' && <LeadsTab pin={pin} />}
          {activeTab === 'contacts' && <ContactsTab pin={pin} />}
          {activeTab === 'responses' && <ResponsesTab pin={pin} />}
          {activeTab === 'users' && <UsersTab pin={pin} />}
          {activeTab === 'orders' && <OrdersTab pin={pin} />}
          {activeTab === 'documents' && <DocumentsTab pin={pin} />}
          {activeTab === 'markups' && <MarkupsTab pin={pin} />}
          {activeTab === 'disputes' && <DisputesTab pin={pin} />}
        </div>
      </div>
    </div>
  );
}
