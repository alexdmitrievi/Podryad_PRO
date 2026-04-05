'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput';
import Spinner from '@/components/ui/Spinner';

const InteractiveMap = dynamic(() => import('@/components/YandexMap'), { ssr: false });

interface PublicOrder {
  order_id: string;
  order_number: string | null;
  address: string;
  lat: number;
  lon: number;
  work_type: string;
  people: number;
  hours: number;
  comment: string | null;
  created_at: string;
  customer_total: number | null;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  labor: 'Рабочая сила',
  equipment: 'Техника',
  materials: 'Материалы',
  complex: 'Комплексный',
  loading: 'Грузчики',
  landscaping: 'Благоустройство',
  construction: 'Строительство',
  demolition: 'Демонтаж',
  cleaning: 'Уборка',
};

const WORK_TYPE_COLORS: Record<string, string> = {
  labor: 'bg-blue-100 text-blue-700',
  equipment: 'bg-amber-100 text-amber-700',
  materials: 'bg-emerald-100 text-emerald-700',
  complex: 'bg-purple-100 text-purple-700',
  loading: 'bg-blue-100 text-blue-700',
  landscaping: 'bg-emerald-100 text-emerald-700',
  construction: 'bg-orange-100 text-orange-700',
  demolition: 'bg-red-100 text-red-700',
  cleaning: 'bg-teal-100 text-teal-700',
};

/* ── Response modal ─────────────────────────────────────────── */

function ResponseModal({ order, onClose }: { order: PublicOrder; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [price, setPrice] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) { setPhoneError('Введите корректный номер'); return; }
    setPhoneError('');
    if (!consent || !name.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/orders/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.order_id,
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim() || undefined,
          price: price ? Number(price) : undefined,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Откликнуться на заказ">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-xl relative animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Закрыть" className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500">
          ✕
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="confetti-container">
              {[...Array(8)].map((_, i) => <span key={i} className="confetti-dot" />)}
            </div>
            <div className="success-icon mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600 success-check"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Отклик отправлен!</h3>
            <p className="text-gray-500 text-sm">Администратор рассмотрит вашу заявку и свяжется с вами.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Откликнуться на заказ</h3>
            <p className="text-gray-500 text-sm mb-6">
              #{order.order_number || order.order_id.slice(0, 8)} — {order.address}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ваше имя</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон <span className="text-red-400">*</span></label>
                <PhoneInput value={phone} onChange={setPhone} required error={phoneError} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ваша цена (необязательно)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Сумма в рублях"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Комментарий</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Опыт, сроки, особенности..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow" />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer" />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Я даю согласие на обработку персональных данных в соответствии с&nbsp;
                  <a href="/privacy" className="text-brand-500 underline" target="_blank">ФЗ №152</a>
                </span>
              </label>
              <button type="submit" disabled={loading || !consent || !name.trim() || !phone.trim()}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-glow-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                {loading ? <><Spinner className="w-5 h-5 text-white" /> Отправляем...</> : 'Отправить отклик'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PublicOrder | null>(null);
  const [respondOrder, setRespondOrder] = useState<PublicOrder | null>(null);
  const [view, setView] = useState<'list' | 'map'>('map');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/orders/public')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.work_type === filter || (filter === 'equipment' && o.work_type === 'equipment'));

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const [now] = useState(() => Date.now());

  function formatTimeAgo(iso: string) {
    const diff = now - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} дн. назад`;
  }

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Подряд PRO" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-extrabold text-brand-900 font-heading">Подряд PRO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/orders/new" className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors btn-press">
              + Заказать рабочих
            </Link>
            <Link href="/" className="text-brand-500 hover:text-brand-600 font-semibold text-sm flex items-center gap-1 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span className="hidden sm:inline">На главную</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-8 px-4 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading mb-1">
                Активные заказы
              </h1>
              <p className="text-gray-500 text-sm">
                {orders.length > 0
                  ? `${filteredOrders.length} заказ${filteredOrders.length === 1 ? '' : filteredOrders.length < 5 ? 'а' : 'ов'} на карте`
                  : 'Откликнитесь на подходящий заказ — админ выберет лучшего исполнителя'}
              </p>
            </div>
            {/* CTA buttons for mobile */}
            <div className="flex gap-2 sm:hidden">
              <Link href="/orders/new" className="flex-1 bg-brand-500 text-white font-bold text-sm text-center py-2.5 rounded-lg">
                + Рабочие
              </Link>
              <Link href="/orders/new-rental" className="flex-1 bg-amber-500 text-white font-bold text-sm text-center py-2.5 rounded-lg">
                + Техника
              </Link>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* View toggle */}
            <div className="flex gap-2">
              <button onClick={() => setView('map')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${view === 'map' ? 'bg-brand-500 text-white shadow-glow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Карта
              </button>
              <button onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${view === 'list' ? 'bg-brand-500 text-white shadow-glow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Список
              </button>
            </div>

            {/* Filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'Все' },
                { key: 'labor', label: 'Рабочие' },
                { key: 'equipment', label: 'Техника' },
                { key: 'materials', label: 'Материалы' },
              ].map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                    filter === f.key
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Пока нет активных заказов</h3>
              <p className="text-gray-500 mb-6">Создайте первый заказ или подождите, пока заказчики разместят свои</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/orders/new" className="inline-flex items-center justify-center bg-brand-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-600 transition-colors">
                  Заказать рабочих
                </Link>
                <Link href="/orders/new-rental" className="inline-flex items-center justify-center bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors">
                  Арендовать технику
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Map view */}
              {view === 'map' && (
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-card" style={{ height: '500px' }}>
                  <InteractiveMap
                    mode="display"
                    orders={filteredOrders.map((o) => ({
                      order_id: o.order_id,
                      order_number: o.order_number,
                      address: o.address,
                      lat: o.lat,
                      lon: o.lon,
                      work_type: o.work_type,
                    }))}
                    onOrderClick={(mapOrder) => {
                      const full = orders.find((o) => o.order_id === mapOrder.order_id);
                      if (full) setSelectedOrder(full);
                    }}
                  />
                </div>
              )}

              {/* Selected order card (from map click) */}
              {selectedOrder && view === 'map' && (
                <div className="mt-4 bg-white rounded-2xl p-6 shadow-card border border-gray-100 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold text-gray-900">#{selectedOrder.order_number || selectedOrder.order_id.slice(0, 8)}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${WORK_TYPE_COLORS[selectedOrder.work_type] || 'bg-gray-100 text-gray-700'}`}>
                          {WORK_TYPE_LABELS[selectedOrder.work_type] || selectedOrder.work_type}
                        </span>
                        <span className="text-xs text-gray-400">{formatTimeAgo(selectedOrder.created_at)}</span>
                      </div>
                      <p className="text-gray-600 text-sm flex items-start gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 mt-0.5 flex-shrink-0" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {selectedOrder.address}
                      </p>
                      {selectedOrder.comment && <p className="text-gray-500 text-sm mt-1">{selectedOrder.comment}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {selectedOrder.lat && selectedOrder.lon && (
                          <a href={`https://yandex.ru/maps/?pt=${selectedOrder.lon},${selectedOrder.lat}&z=16&l=map`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-brand-500 text-xs font-semibold hover:underline">
                            Яндекс.Карты
                          </a>
                        )}
                        {selectedOrder.lat && selectedOrder.lon && (
                          <a href={`yandexnavi://build_route_on_map?lat_to=${selectedOrder.lat}&lon_to=${selectedOrder.lon}`}
                            className="text-brand-500 text-xs font-semibold hover:underline">
                            Навигатор
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {selectedOrder.customer_total != null && selectedOrder.customer_total > 0 && (
                        <span className="text-lg font-extrabold text-brand-500">{selectedOrder.customer_total.toLocaleString('ru-RU')} ₽</span>
                      )}
                      <button onClick={() => setRespondOrder(selectedOrder)}
                        className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all hover:shadow-[0_4px_20px_rgba(47,91,255,0.3)] cursor-pointer whitespace-nowrap">
                        Откликнуться
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* List view */}
              {view === 'list' && (
                <div className="space-y-4 list-stagger">
                  {filteredOrders.map((order) => (
                    <div key={order.order_id}
                      className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 card-lift">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-bold text-gray-900">
                              #{order.order_number || order.order_id.slice(0, 8)}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${WORK_TYPE_COLORS[order.work_type] || 'bg-gray-100 text-gray-700'}`}>
                              {WORK_TYPE_LABELS[order.work_type] || order.work_type}
                            </span>
                            <span className="text-xs text-gray-400">{formatTimeAgo(order.created_at)}</span>
                          </div>
                          <p className="text-gray-700 text-sm mb-1 flex items-start gap-1.5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 mt-0.5 flex-shrink-0" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {order.address || 'Адрес не указан'}
                          </p>
                          {order.comment && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{order.comment}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            {order.people > 0 && <span>{order.people} чел.</span>}
                            {order.hours > 0 && <span>{order.hours} ч.</span>}
                            <span>{formatDate(order.created_at)}</span>
                            {order.lat && order.lon && (
                              <>
                                <a href={`https://yandex.ru/maps/?pt=${order.lon},${order.lat}&z=16&l=map`}
                                  target="_blank" rel="noopener noreferrer" className="text-brand-500 font-semibold hover:underline">
                                  Яндекс.Карты
                                </a>
                                <a href={`yandexnavi://build_route_on_map?lat_to=${order.lat}&lon_to=${order.lon}`}
                                  className="text-brand-500 font-semibold hover:underline">
                                  Навигатор
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {order.customer_total != null && order.customer_total > 0 && (
                            <span className="text-lg font-extrabold text-brand-500">{order.customer_total.toLocaleString('ru-RU')} ₽</span>
                          )}
                          <button onClick={() => setRespondOrder(order)}
                            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all hover:shadow-[0_4px_20px_rgba(47,91,255,0.3)] cursor-pointer whitespace-nowrap">
                            Откликнуться
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {respondOrder && <ResponseModal order={respondOrder} onClose={() => setRespondOrder(null)} />}
    </div>
  );
}
