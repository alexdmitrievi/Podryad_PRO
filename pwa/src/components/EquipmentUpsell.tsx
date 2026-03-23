'use client';

import Link from 'next/link';
import { EQUIPMENT } from '@/lib/equipment';
import type { EquipmentItem } from '@/lib/equipment';
import type { WorkType } from '@/lib/rates';

const WORK_TYPE_TO_CATEGORIES: Record<WorkType, ('garden' | 'construction' | 'special')[]> = {
  грузчики: [],
  уборка: ['special'],
  стройка: ['construction'],
  разнорабочие: ['construction', 'garden'],
  другое: ['garden', 'construction', 'special'],
};

const POPULAR_IDS = ['hammer-drill-1', 'grinder-1', 'chainsaw-1', 'pressure-washer-1'];

const SHORT_NAMES: Record<string, string> = {
  'hammer-drill-1': 'Перфоратор',
  'grinder-1': 'Болгарка',
  'chainsaw-1': 'Бензопила',
  'pressure-washer-1': 'Мойка',
};

function getRelevantEquipment(workType: WorkType | null | undefined): EquipmentItem[] {
  if (!workType) {
    return POPULAR_IDS.map((id) => EQUIPMENT.find((e) => e.id === id)).filter(
      (e): e is EquipmentItem => e != null
    );
  }

  const categories = WORK_TYPE_TO_CATEGORIES[workType];
  if (categories.length === 0) return [];

  return EQUIPMENT.filter((e) => categories.includes(e.category)).slice(0, 4);
}

interface Props {
  workType?: WorkType | null;
}

export default function EquipmentUpsell({ workType = null }: Props) {
  const items = getRelevantEquipment(workType ?? null);

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 space-y-4">
      <h3 className="font-bold text-gray-900">🔧 Нужна техника для работы?</h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        Арендуйте инструмент со скидкой 15% при заказе исполнителей через нашу
        платформу.
      </p>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Популярное:
        </p>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-gray-700">
              {item.image_placeholder}{' '}
              {SHORT_NAMES[item.id] ?? item.name} — от{' '}
              {item.rate_4h.toLocaleString('ru-RU')}₽/4ч
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/equipment"
        className="
          inline-flex items-center gap-1.5 text-brand-500 text-sm font-semibold
          hover:text-brand-600 transition-colors
        "
      >
        Весь каталог техники →
      </Link>
    </div>
  );
}
