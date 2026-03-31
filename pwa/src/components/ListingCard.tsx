'use client';

import { Truck, CheckCircle, Phone } from 'lucide-react';

export type Listing = {
  id: number;
  listing_id: string;
  title: string;
  description?: string | null;
  specs?: string | null;
  price: number;
  price_unit: string;
  min_order?: string | null;
  delivery_included: boolean;
  delivery_price?: number | null;
  delivery_note?: string | null;
  city: string;
  is_active?: boolean;
  views_count: number;
  contacts_count: number;
  supplier?: {
    company_name: string;
    city: string;
    delivery_available: boolean;
    is_verified: boolean;
  } | null;
  category?: {
    name: string;
    type: string;
    unit: string;
    icon: string;
  } | null;
};

type Props = {
  listing: Listing;
  isBest?: boolean;
  onContact: (listing: Listing) => void;
};

export default function ListingCard({ listing, isBest, onContact }: Props) {
  const priceStr = listing.price.toLocaleString('ru-RU');
  const unit = listing.category?.unit ?? listing.price_unit;

  return (
    <div
      className={`relative bg-white dark:bg-dark-card rounded-2xl border transition-all duration-200 hover:shadow-md ${
        isBest
          ? 'border-green-400 shadow-green-100 dark:shadow-green-900/20 shadow-sm'
          : 'border-gray-100 dark:border-dark-border'
      }`}
    >
      {isBest && (
        <div className="absolute -top-2.5 left-4 bg-green-500 text-white text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
          <span>🏆</span> ЛУЧШАЯ ЦЕНА
        </div>
      )}

      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {listing.category?.icon && (
                <span className="text-base leading-none">{listing.category.icon}</span>
              )}
              <span className="text-xs text-gray-400 dark:text-dark-muted">
                {listing.category?.name}
              </span>
              {listing.supplier?.is_verified && (
                <CheckCircle size={12} className="text-brand-500 shrink-0" />
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
              {listing.title}
            </h3>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold text-gray-900 dark:text-white">
              {priceStr} ₽
            </div>
            <div className="text-xs text-gray-400 dark:text-dark-muted">за {unit}</div>
          </div>
        </div>

        {/* Specs / description */}
        {(listing.specs || listing.description) && (
          <p className="text-xs text-gray-500 dark:text-dark-muted mb-2 line-clamp-2">
            {listing.specs || listing.description}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] bg-gray-50 dark:bg-dark-bg text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5">
            📍 {listing.city}
          </span>
          {listing.min_order && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-gray-50 dark:bg-dark-bg text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5">
              Мин: {listing.min_order}
            </span>
          )}
          {listing.delivery_included ? (
            <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5">
              <Truck size={10} /> Доставка включена
            </span>
          ) : listing.delivery_price ? (
            <span className="inline-flex items-center gap-1 text-[11px] bg-gray-50 dark:bg-dark-bg text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5">
              <Truck size={10} /> Доставка {listing.delivery_price.toLocaleString('ru-RU')} ₽
            </span>
          ) : listing.supplier?.delivery_available ? (
            <span className="inline-flex items-center gap-1 text-[11px] bg-gray-50 dark:bg-dark-bg text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5">
              <Truck size={10} /> Доставка
            </span>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {listing.supplier?.company_name}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-dark-muted">
              {listing.contacts_count > 0 && `${listing.contacts_count} контактов`}
            </p>
          </div>
          <button
            onClick={() => onContact(listing)}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <Phone size={13} />
            Связаться
          </button>
        </div>
      </div>
    </div>
  );
}
