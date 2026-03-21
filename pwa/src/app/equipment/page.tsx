'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import EquipmentCard from '@/components/EquipmentCard';
import { EQUIPMENT, EQUIPMENT_CATEGORIES } from '@/lib/equipment';
import type { EquipmentCategory } from '@/lib/equipment';

const FILTER_ALL = 'all' as const;
const VALID_CATS = ['garden', 'construction', 'special'] as const;

function EquipmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get('cat');

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

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return EQUIPMENT;
    return EQUIPMENT.filter((e) => e.category === filter);
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <PageHeader
        title="🔧 Аренда техники"
        subtitle="Строительный инструмент и садовая техника"
        backHref="/"
      />

      <div className="max-w-lg mx-auto p-4 space-y-6 pb-10">
        {/* ─── Фильтр по категориям ─── */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === FILTER_ALL
                ? 'bg-[#0088cc] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      ? 'bg-[#0088cc] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {icon} {shortLabel}
                </button>
              );
            }
          )}
        </div>

        {/* ─── Баннер скидки ─── */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-800">
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

        {/* ─── Список техники ─── */}
        <div className="space-y-4">
          {filtered.map((item) => (
            <EquipmentCard key={item.id} item={item} showComboDiscount />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <EquipmentPageContent />
    </Suspense>
  );
}
