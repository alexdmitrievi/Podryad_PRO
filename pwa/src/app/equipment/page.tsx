'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import EquipmentCard from '@/components/EquipmentCard';
import BottomNav from '@/components/BottomNav';
import { EQUIPMENT, EQUIPMENT_CATEGORIES } from '@/lib/equipment';
import type { EquipmentItem, EquipmentCategory } from '@/lib/equipment';
import { useAuth } from '@/hooks/useAuth';

const FILTER_ALL = 'all' as const;
const VALID_CATS = ['garden', 'construction', 'special'] as const;

function EquipmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get('cat');
  const { userId } = useAuth();

  const [items, setItems] = useState<EquipmentItem[]>(EQUIPMENT);
  const [booking, setBooking] = useState<{ id: string; duration: string } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const filter: string =
    catParam && VALID_CATS.includes(catParam as (typeof VALID_CATS)[number])
      ? catParam
      : FILTER_ALL;

  const setFilter = (value: string) => {
    if (value === FILTER_ALL) {
      router.push('/equipment');
    } else {
      router.push(`/equipment?cat=${value}`);
    }
  };

  // Загружаем техику из Supabase (с fallback на хардкод)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/equipment')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setItems(
            data.map((d: Record<string, unknown>) => ({
              id: String(d.equipment_id || d.id || ''),
              name: String(d.name || ''),
              category: String(d.category || 'garden') as EquipmentCategory,
              description: String(d.description || ''),
              specs: String(d.specs || ''),
              rate_4h: Number(d.rate_4h) || 0,
              rate_day: Number(d.rate_day) || 0,
              rate_3days: Number(d.rate_3days) || 0,
              deposit: Number(d.deposit) || 0,
              available: d.status === 'available',
              image_placeholder: String(d.image_placeholder || '🔧'),
            }))
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return items;
    return items.filter((e) => e.category === filter);
  }, [filter, items]);

  const handleBook = useCallback(
    async (equipmentId: string, duration: string) => {
      if (!userId) {
        router.push('/auth/login');
        return;
      }
      setBookingLoading(true);
      setBookingError('');
      setBooking({ id: equipmentId, duration });
      try {
        const res = await fetch('/api/equipment/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ equipment_id: equipmentId, duration }),
        });
        const data = await res.json() as { payment_url?: string; error?: string };
        if (!res.ok) throw new Error(data.error || 'Ошибка бронирования');
        if (data.payment_url) {
          window.open(data.payment_url, '_blank');
        }
      } catch (e) {
        setBookingError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setBookingLoading(false);
        setBooking(null);
      }
    },
    [userId, router]
  );

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-dark-bg pt-16">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PageHeader
          title="🔧 Аренда техники"
          subtitle="Строительный инструмент и садовая техника"
          backHref="/"
        />

        <div className="max-w-lg mx-auto p-4 space-y-6 pb-10">
          {/* Фильтр по категориям */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === FILTER_ALL
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border'
              }`}
            >
              Все
            </button>
            {(Object.entries(EQUIPMENT_CATEGORIES) as [EquipmentCategory, { icon: string }][]).map(
              ([key, { icon }]) => {
                const shortLabel =
                  key === 'garden'
                    ? 'Сад'
                    : key === 'construction'
                      ? 'Стройка'
                      : 'Спец';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key as string)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filter === key
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border'
                    }`}
                  >
                    {icon} {shortLabel}
                  </button>
                );
              }
            )}
          </div>

          {/* Баннер скидки */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              🎁 Скидка 15% на аренду техники при заказе исполнителей через
              Подряд PRO
            </p>
            <Link
              href="/app/order"
              className="inline-block mt-3 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all"
            >
              Заказать исполнителей →
            </Link>
          </div>

          {bookingError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              {bookingError}
            </div>
          )}

          {/* Список техники */}
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.id}>
                <EquipmentCard item={item} showComboDiscount />
                {item.available && (
                  <div className="flex gap-2 mt-2 px-1">
                    {(['4h', 'day', '3days'] as const).map((dur) => {
                      const price = dur === '4h' ? item.rate_4h : dur === 'day' ? item.rate_day : item.rate_3days;
                      const label = dur === '4h' ? '4ч' : dur === 'day' ? 'День' : '3 дня';
                      const isBooking = booking?.id === item.id && booking?.duration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          disabled={bookingLoading}
                          onClick={() => handleBook(item.id, dur)}
                          className="flex-1 rounded-xl bg-brand-500 text-white py-2 text-xs font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isBooking ? '...' : `${label} — ${price.toLocaleString('ru-RU')}₽`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-dark-bg" />}>
      <EquipmentPageContent />
    </Suspense>
  );
}
