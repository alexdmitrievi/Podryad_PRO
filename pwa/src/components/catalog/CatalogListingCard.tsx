'use client';

import { Shield, Star, Users } from 'lucide-react';
import Link from 'next/link';

export type CatalogListing = {
  id: number;
  title: string;
  description?: string | null;
  listing_type: 'labor' | 'material' | 'equipment_rental';
  category_slug?: string | null;
  subcategory?: string | null;
  price: number; // display_price mapped to price by API
  price_unit: string;
  images?: string[];
  rating?: number;
  orders_count?: number;
  is_priority?: boolean;
  city: string;
  supplier_id?: string;
  suppliers?: {
    name?: string | null;
    company_name?: string | null;
    worker_type?: string | null;
    crew_size?: number | null;
    rating?: number | null;
    completed_orders?: number | null;
    is_verified?: boolean | null;
  } | null;
};

type Props = {
  listing: CatalogListing;
};

export default function CatalogListingCard({ listing }: Props) {
  const supplier = listing.suppliers;
  const isCrew = supplier?.worker_type === 'crew';
  const displayName = supplier?.name || supplier?.company_name || '';
  const priceStr = listing.price.toLocaleString('ru-RU');
  const rating = listing.rating ?? supplier?.rating ?? 0;
  const ordersCount = listing.orders_count ?? supplier?.completed_orders ?? 0;

  return (
    <Link
      href={`/order/new?listing=${listing.id}&type=${listing.listing_type}`}
      className="block bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="p-4">
        {/* Supplier header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isCrew && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full px-2 py-0.5">
                  <Users size={10} />
                  Бригада ★
                </span>
              )}
              {supplier?.is_verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
                  ✓ Верифицирован
                </span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
              {displayName || listing.title}
            </h3>
            {displayName && (
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 line-clamp-1">
                {listing.title}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        {(rating > 0 || ordersCount > 0) && (
          <div className="flex items-center gap-3 mb-2.5">
            {rating > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                {rating.toFixed(1)}
              </span>
            )}
            {ordersCount > 0 && (
              <span className="text-xs text-gray-400 dark:text-dark-muted">
                {ordersCount} заказов
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-dark-muted">📍 {listing.city}</span>
          </div>
        )}

        {/* Price + SafeDeal badge */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white">
              {priceStr} ₽
              <span className="text-sm font-normal text-gray-400 dark:text-dark-muted ml-1">
                / {listing.price_unit}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Shield size={11} className="text-brand-500" />
              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                Безопасная сделка
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              // handled by Link
            }}
            className="shrink-0 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Заказать
          </button>
        </div>
      </div>
    </Link>
  );
}
