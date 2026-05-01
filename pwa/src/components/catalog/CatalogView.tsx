'use client';

import { useEffect, useState, useCallback } from 'react';
import { Filter, SlidersHorizontal } from 'lucide-react';
import CategoryTabs, { type CatalogType } from './CategoryTabs';
import CatalogListingCard, { type CatalogListing } from './CatalogListingCard';
import PriceCalculator from './PriceCalculator';
import { log } from '@/lib/logger';

const CITIES = [
  { value: 'all', label: 'Все города' },
  { value: 'Омск', label: 'Омск' },
  { value: 'Новосибирск', label: 'Новосибирск' },
  { value: 'Тюмень', label: 'Тюмень' },
];

type Props = { type: CatalogType };

type ApiResponse = {
  listings: CatalogListing[];
  total: number;
  page: number;
  totalPages: number;
};

export default function CatalogView({ type }: Props) {
  const [listings, setListings] = useState<CatalogListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [subcategory, setSubcategory] = useState<string | undefined>();
  const [city, setCity] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchListings = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, page: String(reset ? 1 : page), limit: '20' });
      if (subcategory) params.set('category', subcategory);
      if (city !== 'all') params.set('city', city);

      const res = await fetch(`/api/listings?${params}`);
      const data: ApiResponse = await res.json();
      setListings(data.listings || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      if (reset) setPage(1);
    } catch (e) {
      log.error('CatalogView error', { error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [type, subcategory, city, page]);

  useEffect(() => {
    fetchListings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subcategory, city]);

  useEffect(() => {
    if (page > 1) fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSubcategoryChange(sub: string | undefined) {
    setSubcategory(sub);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <CategoryTabs
        activeType={type}
        activeSubcategory={subcategory}
        onSubcategoryChange={handleSubcategoryChange}
      />

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* City filter + total count */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Filter size={13} className="text-gray-400 shrink-0" />
            {CITIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCity(c.value); setPage(1); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  city === c.value
                    ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-xs text-gray-400 dark:text-dark-muted shrink-0">
              {total} объявлений
            </span>
          )}
        </div>

        <div className="flex gap-5">
          {/* Listings grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 animate-pulse"
                  >
                    <div className="h-4 bg-gray-100 dark:bg-dark-border rounded-full w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-dark-border rounded-full w-1/2 mb-4" />
                    <div className="h-10 bg-gray-100 dark:bg-dark-border rounded-xl" />
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mb-4">
                  <SlidersHorizontal size={28} className="text-gray-300 dark:text-dark-border" />
                </div>
                <p className="text-gray-500 dark:text-dark-muted font-medium">Предложений пока нет</p>
                <p className="text-sm text-gray-400 dark:text-dark-muted mt-1">
                  Попробуйте изменить фильтры
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {listings.map((listing) => (
                    <CatalogListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border disabled:opacity-40 cursor-pointer disabled:cursor-default"
                    >
                      ← Назад
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-500 dark:text-dark-muted">
                      {page} / {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border disabled:opacity-40 cursor-pointer disabled:cursor-default"
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block w-72 shrink-0">
            <PriceCalculator />
          </aside>
        </div>

        {/* Mobile calculator */}
        <div className="lg:hidden mt-6">
          <PriceCalculator />
        </div>
      </div>
    </div>
  );
}
