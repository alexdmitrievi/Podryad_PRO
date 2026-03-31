'use client';

import { FormEvent, useState } from 'react';
import type { Listing } from './ListingCard';

type Category = {
  slug: string;
  name: string;
  type: string;
  unit: string;
  icon: string;
};

type Props = {
  categories: Category[];
  supplierCity: string;
  onSuccess: (listing: Listing) => void;
  onCancel: () => void;
  initial?: Listing | null;
};

const CITIES = ['Омск', 'Новосибирск', 'Тюмень', 'Екатеринбург', 'Другой'];

export default function ListingForm({ categories, supplierCity, onSuccess, onCancel, initial }: Props) {
  const [categorySlug, setCategorySlug] = useState(initial?.category?.name ? '' : (categories[0]?.slug ?? ''));
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [specs, setSpecs] = useState(initial?.specs ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [minOrder, setMinOrder] = useState(initial?.min_order ?? '');
  const [deliveryIncluded, setDeliveryIncluded] = useState(initial?.delivery_included ?? false);
  const [deliveryPrice, setDeliveryPrice] = useState(initial?.delivery_price ? String(initial.delivery_price) : '');
  const [deliveryNote, setDeliveryNote] = useState(initial?.delivery_note ?? '');
  const [city, setCity] = useState(initial?.city ?? supplierCity ?? 'Омск');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.slug === categorySlug);
  const isEdit = Boolean(initial);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const body = {
        category_slug: categorySlug,
        title: title.trim(),
        description: description.trim() || undefined,
        specs: specs.trim() || undefined,
        price: parseFloat(price),
        price_unit: selectedCategory?.unit ?? 'ед.',
        min_order: minOrder.trim() || undefined,
        delivery_included: deliveryIncluded,
        delivery_price: deliveryPrice ? parseFloat(deliveryPrice) : undefined,
        delivery_note: deliveryNote.trim() || undefined,
        city,
      };

      const url = isEdit ? `/api/marketplace/listings/${initial!.listing_id}` : '/api/marketplace/listings';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<Listing>;
      if (!res.ok) {
        const msgs: Record<string, string> = {
          missing_fields: 'Заполните обязательные поля',
          invalid_price: 'Некорректная цена',
          forbidden: 'Нет доступа',
        };
        setError(msgs[data.error ?? ''] ?? 'Ошибка сохранения');
        return;
      }
      onSuccess(data as Listing);
    } catch {
      setError('Ошибка сети');
    } finally {
      setPending(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-3.5 py-3 text-sm dark:text-white outline-none focus:ring-2 ring-brand-500 transition-shadow';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          Категория <span className="text-red-400">*</span>
        </label>
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          required
          className={inputCls}
        >
          <option value="">— выберите —</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.icon} {c.name} ({c.unit})
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          Название предложения <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder={selectedCategory?.type === 'material' ? 'Бетон М300, завод Омск-Бетон' : 'Экскаватор JCB 3CX, 2021 г.'}
        />
      </div>

      {/* Specs */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          Характеристики (марка, фракция, объём и т.д.)
        </label>
        <input
          type="text"
          value={specs}
          onChange={(e) => setSpecs(e.target.value)}
          className={inputCls}
          placeholder={selectedCategory?.type === 'material' ? 'М300, В22.5, П3' : 'Вылет стрелы 6м, ковш 0.35м³'}
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="Дополнительная информация"
        />
      </div>

      {/* Price + min order */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Цена, ₽ <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
            placeholder="5000"
          />
          {selectedCategory && (
            <p className="text-[11px] text-gray-400 mt-0.5">за {selectedCategory.unit}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Минимальный заказ
          </label>
          <input
            type="text"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            className={inputCls}
            placeholder="5 м³"
          />
        </div>
      </div>

      {/* City */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Город</label>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Delivery */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={deliveryIncluded}
            onChange={(e) => setDeliveryIncluded(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Доставка включена в цену</span>
        </label>
        {!deliveryIncluded && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Цена доставки, ₽
              </label>
              <input
                type="number"
                min="0"
                value={deliveryPrice}
                onChange={(e) => setDeliveryPrice(e.target.value)}
                className={inputCls}
                placeholder="0 = договорная"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Примечание
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                className={inputCls}
                placeholder="по городу"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 dark:border-dark-border py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors cursor-pointer"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {pending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Опубликовать'}
        </button>
      </div>
    </form>
  );
}
