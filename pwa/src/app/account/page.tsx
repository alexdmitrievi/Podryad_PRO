'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';
import {
  User, Building2, Package, Settings, LogOut, ChevronRight,
  RefreshCw, Phone, MapPin, Calendar, Clock,
} from 'lucide-react';

type CustomerType = 'personal' | 'business';

interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  customer_type: CustomerType;
  org_name: string | null;
  inn: string | null;
  city: string | null;
  preferred_contact: string | null;
  created_at: string;
}

type OrderStatus = 'pending' | 'priced' | 'payment_sent' | 'paid' | 'in_progress' | 'confirming' | 'completed' | 'disputed' | 'cancelled';

interface Order {
  id: string;
  work_type: string;
  subcategory?: string;
  description?: string;
  address?: string;
  work_date?: string;
  status: OrderStatus;
  display_price?: number;
  customer_total?: number;
  city?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string }> = {
  pending:      { label: 'На рассмотрении', badge: 'bg-gray-100 text-gray-600' },
  priced:       { label: 'Ожидает оплату',  badge: 'bg-amber-100 text-amber-700' },
  payment_sent: { label: 'Ожидает оплату',  badge: 'bg-amber-100 text-amber-700' },
  paid:         { label: 'Оплачен',          badge: 'bg-blue-100 text-blue-700' },
  in_progress:  { label: 'В работе',         badge: 'bg-blue-100 text-blue-700' },
  confirming:   { label: 'Подтверждение',    badge: 'bg-violet-100 text-violet-700' },
  completed:    { label: 'Завершён',          badge: 'bg-green-100 text-green-700' },
  disputed:     { label: 'Спор',             badge: 'bg-red-100 text-red-700' },
  cancelled:    { label: 'Отменён',          badge: 'bg-gray-100 text-gray-500' },
};

const WORK_TYPE_LABELS: Record<string, string> = {
  labor: 'Рабочие руки',
  equipment: 'Техника',
  materials: 'Материалы',
  combo: 'Комплекс',
};

const CITY_LABELS: Record<string, string> = {
  omsk: 'Омск',
  novosibirsk: 'Новосибирск',
};

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ru-RU'); } catch { return iso; }
}
function fmtPrice(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

type Tab = 'orders' | 'profile';

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editName, setEditName] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [editInn, setEditInn] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editType, setEditType] = useState<CustomerType>('personal');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.customer) { router.push('/login'); return; }
        const c = data.customer as CustomerProfile;
        setProfile(c);
        setEditName(c.name);
        setEditOrgName(c.org_name || '');
        setEditInn(c.inn || '');
        setEditCity(c.city || 'omsk');
        setEditType(c.customer_type);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const loadOrders = useCallback(async () => {
    setOrdersLoaded(false);
    const res = await fetch('/api/account');
    const data = await res.json();
    setOrders(data.orders || []);
    setOrdersLoaded(true);
  }, []);

  useEffect(() => {
    if (profile && tab === 'orders') loadOrders();
  }, [profile, tab, loadOrders]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) { showToast('Введите имя', 'error'); return; }
    if (editType === 'business' && !editOrgName.trim()) { showToast('Введите название организации', 'error'); return; }
    if (newPwd && newPwd.length < 8) { showToast('Пароль минимум 8 символов', 'error'); return; }
    if (newPwd && (!/[A-ZА-Я]/.test(newPwd) || !/[0-9]/.test(newPwd))) { showToast('Пароль должен содержать заглавную букву и цифру', 'error'); return; }
    if (newPwd && newPwd !== newPwdConfirm) { showToast('Пароли не совпадают', 'error'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          customer_type: editType,
          org_name: editOrgName || null,
          inn: editInn || null,
          city: editCity,
          current_password: currentPwd || undefined,
          new_password: newPwd || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Профиль сохранён', 'success');
        setProfile(prev => prev ? { ...prev, name: editName, customer_type: editType, org_name: editOrgName || null, inn: editInn || null, city: editCity } : prev);
        setCurrentPwd(''); setNewPwd(''); setNewPwdConfirm('');
      } else {
        showToast(data.error || 'Ошибка', 'error');
      }
    } catch {
      showToast('Ошибка соединения', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2F5BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const TABS = [
    { id: 'orders' as Tab, label: 'Мои заказы', icon: Package },
    { id: 'profile' as Tab, label: 'Профиль', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1f5c] to-[#2d35a8] text-white px-4 py-4 flex-shrink-0">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors mb-3">
            ← Главная
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {profile.customer_type === 'business'
                  ? <Building2 className="w-5 h-5 text-white/70" />
                  : <User className="w-5 h-5 text-white/70" />
                }
                <h1 className="font-heading font-extrabold text-xl text-white">{profile.name}</h1>
              </div>
              {profile.org_name && (
                <p className="text-white/70 text-sm">{profile.org_name}{profile.inn ? ` · ИНН ${profile.inn}` : ''}</p>
              )}
              <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                <Phone className="w-3 h-3" />
                <span>+7 {profile.phone.replace(/^7/, '').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2-$3-$4')}</span>
                {profile.city && <><span>·</span><MapPin className="w-3 h-3" /><span>{CITY_LABELS[profile.city] || profile.city}</span></>}
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/80 hover:text-white text-sm font-medium cursor-pointer transition-colors bg-white/10 hover:bg-white/20">
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${tab === t.id ? 'border-[#2F5BFF] text-[#2F5BFF]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {ordersLoaded ? `${orders.length} заказ${orders.length === 1 ? '' : orders.length < 5 ? 'а' : 'ов'}` : 'Загрузка…'}
              </h2>
              <button onClick={loadOrders}
                className="flex items-center gap-1.5 text-sm text-[#2F5BFF] hover:underline cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Обновить
              </button>
            </div>

            <Link href="/order/new"
              className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-[#2F5BFF]/30 hover:border-[#2F5BFF] hover:bg-[#2F5BFF]/5 transition-all cursor-pointer group">
              <span className="text-sm font-semibold text-[#2F5BFF]">+ Новый заказ</span>
              <ChevronRight className="w-4 h-4 text-[#2F5BFF] group-hover:translate-x-1 transition-transform" />
            </Link>

            {ordersLoaded && orders.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Заказов пока нет</p>
              </div>
            )}

            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const price = order.customer_total ?? order.display_price;
              return (
                <div key={order.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-card p-5 border border-gray-50 dark:border-dark-border">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {WORK_TYPE_LABELS[order.work_type] || order.work_type}
                        {order.subcategory && <span className="font-normal text-gray-500"> · {order.subcategory}</span>}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {order.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.address}</span>
                    )}
                    {order.work_date && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(order.work_date)}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(order.created_at)}</span>
                  </div>

                  {price && (
                    <div className="mt-3 pt-3 border-t border-gray-50 dark:border-dark-border flex items-center justify-between">
                      <span className="text-xs text-gray-500">Стоимость</span>
                      <span className="font-bold text-gray-900 dark:text-white">{fmtPrice(price)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Тип заказчика</label>
              <div className="grid grid-cols-2 gap-2">
                {([['personal', 'Частное лицо', User], ['business', 'Бизнес / ИП', Building2]] as const).map(([val, label, Icon]) => (
                  <button key={val} type="button" onClick={() => setEditType(val as CustomerType)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${editType === val ? 'border-[#2F5BFF] bg-[#2F5BFF]/5 text-[#2F5BFF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Личные данные</h3>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {editType === 'business' ? 'Контактное лицо' : 'Имя'} *
                </label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
              </div>

              {editType === 'business' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Организация / ИП *</label>
                    <input value={editOrgName} onChange={e => setEditOrgName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ИНН</label>
                    <input value={editInn} onChange={e => setEditInn(e.target.value.replace(/\D/g, ''))} maxLength={12}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Город</label>
                <select value={editCity} onChange={e => setEditCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF] cursor-pointer">
                  <option value="omsk">Омск</option>
                  <option value="novosibirsk">Новосибирск</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Телефон</label>
                <input value={profile.phone} disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Телефон изменить нельзя</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Изменить пароль</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Текущий пароль</label>
                <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Текущий пароль"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Новый пароль</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Минимум 8 символов, заглавная + цифра"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Повторите пароль</label>
                <input type="password" value={newPwdConfirm} onChange={e => setNewPwdConfirm(e.target.value)} placeholder="Повторите пароль"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-[#2F5BFF] hover:bg-[#2d35a8] text-white font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-50">
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
