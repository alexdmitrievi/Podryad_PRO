'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export type CatalogType = 'labor' | 'material' | 'equipment_rental';

const TABS = [
  { value: 'labor' as const, label: 'Работы', href: '/catalog/labor' },
  { value: 'material' as const, label: 'Материалы', href: '/catalog/materials' },
  { value: 'equipment_rental' as const, label: 'Аренда', href: '/catalog/equipment' },
];

const SUBCATEGORIES: Record<CatalogType, { value: string; label: string }[]> = {
  labor: [
    { value: 'gruzchiki', label: 'Грузчики' },
    { value: 'uborka', label: 'Уборка' },
    { value: 'stroyka', label: 'Стройка' },
    { value: 'raznorabochie', label: 'Разнорабочие' },
  ],
  material: [
    { value: 'beton', label: 'Бетон' },
    { value: 'shcheben', label: 'Щебень' },
    { value: 'bitum', label: 'Битум' },
    { value: 'pechnoe', label: 'Печное топливо' },
    { value: 'pesok', label: 'Песок' },
  ],
  equipment_rental: [
    { value: 'sad', label: 'Сад' },
    { value: 'stroyka', label: 'Стройка' },
    { value: 'spetstehnika', label: 'Спецтехника' },
    { value: 'tyazhelaya', label: 'Тяжёлая техника' },
  ],
};

type Props = {
  activeType: CatalogType;
  activeSubcategory?: string;
  onSubcategoryChange: (sub: string | undefined) => void;
};

export default function CategoryTabs({ activeType, activeSubcategory, onSubcategoryChange }: Props) {
  const subcategories = SUBCATEGORIES[activeType];

  return (
    <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4">
        {/* Main tabs */}
        <div className="flex gap-0 border-b border-gray-100 dark:border-dark-border">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.href}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeType === tab.value
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-gray-400 dark:text-dark-muted hover:text-gray-600'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Subcategory chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2.5">
          <button
            onClick={() => onSubcategoryChange(undefined)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !activeSubcategory
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300'
            }`}
          >
            Все
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub.value}
              onClick={() => onSubcategoryChange(sub.value === activeSubcategory ? undefined : sub.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeSubcategory === sub.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
