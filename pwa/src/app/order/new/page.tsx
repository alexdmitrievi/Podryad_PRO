'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2, ShieldCheck, Tag, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface BasketItem {
  listing_id: number;
  title: string;
  supplier_name: string;
  base_unit_price: number;
  display_unit_price: number;
  quantity: number;
  listing_type: string;
  price_unit: string;
  supplier_id?: string;
}

function OrderNewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from ?listing=id query param
  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (!listingId) return;

    fetch(`/api/listings/${listingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setBasket([{
            listing_id: data.id,
            title: data.title,
            supplier_name: data.suppliers?.name || data.suppliers?.company_name || '',
            base_unit_price: data.base_price ?? data.price,
            display_unit_price: data.price,
            quantity: 1,
            listing_type: data.listing_type || 'labor',
            price_unit: data.price_unit,
            supplier_id: data.supplier_id,
          }]);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  // Totals calculation
  const uniqueTypes = new Set(basket.map((i) => i.listing_type));
  const hasCombo = uniqueTypes.size >= 2;
  const subtotal = basket.reduce((sum, i) => sum + i.display_unit_price * i.quantity, 0);
  const comboDiscount = hasCombo ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
  const total = subtotal - comboDiscount;

  function updateQty(idx: number, delta: number) {
    setBasket((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      item.quantity = Math.max(1, item.quantity + delta);
      updated[idx] = item;
      return updated;
    });
  }

  function removeItem(idx: number) {
    setBasket((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!basket.length) {
      setError('Добавьте хотя бы одну позицию');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: basket.map((i) => ({
            listing_id: i.listing_id,
            title: i.title,
            base_unit_price: i.base_unit_price,
            display_unit_price: i.display_unit_price,
            quantity: i.quantity,
            listing_type: i.listing_type,
            price_unit: i.price_unit,
            supplier_id: i.supplier_id,
          })),
          customer: { name, phone, scheduled_date: scheduledDate, time, comment },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка создания заказа');
        return;
      }
      // Redirect to pay page
      router.push(
        `/order/${data.order_id}/pay?subtotal=${data.customer_total}&phone=${encodeURIComponent(phone)}&comboDiscount=${data.combo_discount}`
      );
    } catch {
      setError('Ошибка соединения. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/catalog" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
            ← Каталог
          </Link>
          <h1 className="font-bold text-gray-900 dark:text-white">Оформить заказ</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Basket */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Состав заказа</h2>

          {basket.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-dark-muted">
              <p>Корзина пуста</p>
              <Link href="/catalog" className="mt-2 block text-brand-500 text-sm font-medium">
                Перейти в каталог →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {basket.map((item, idx) => (
                <div key={item.listing_id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
                      {item.supplier_name} · {item.display_unit_price.toLocaleString('ru-RU')} ₽/{item.price_unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(idx, -1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center cursor-pointer hover:bg-gray-200"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(idx, 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center cursor-pointer hover:bg-gray-200"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(idx)}
                      className="w-7 h-7 rounded-lg text-red-400 flex items-center justify-center cursor-pointer hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary */}
        {basket.length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Чек</h2>

            <div className="space-y-2 text-sm">
              {basket.map((item) => (
                <div key={item.listing_id} className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span className="line-clamp-1 flex-1 mr-2">{item.title} × {item.quantity}</span>
                  <span className="shrink-0">
                    {(item.display_unit_price * item.quantity).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}

              {hasCombo && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    Комбо-скидка
                  </span>
                  <span>−{comboDiscount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 dark:border-dark-border flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Итого:</span>
                <span>{total.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
              <ShieldCheck size={13} />
              <span>Деньги замораживаются до подтверждения</span>
            </div>
          </div>
        )}

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Контактные данные</h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted mb-1">Имя *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Алексей"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted mb-1">Телефон *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+7 (999) 000-00-00"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted mb-1">Дата</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted mb-1">Время</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted mb-1">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Адрес, уточнения..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || basket.length === 0}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-default"
          >
            {submitting ? 'Создание заказа...' : (
              <>
                Оплатить {total > 0 ? `${total.toLocaleString('ru-RU')} ₽` : ''}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OrderNewPage() {
  return (
    <Suspense>
      <OrderNewContent />
    </Suspense>
  );
}
