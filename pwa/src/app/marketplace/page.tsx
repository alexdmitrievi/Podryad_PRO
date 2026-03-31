'use client';

import { useEffect, useState } from 'react';
import { Store, Filter } from 'lucide-react';
import ListingCard, { type Listing } from '@/components/ListingCard';
import ContactModal from '@/components/ContactModal';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

type Category = {
  slug: string;
  name: string;
  type: 'material' | 'heavy_equipment';
  unit: string;
  icon: string;
};

const CITIES = [
  { value: 'all', label: 'Все города' },
  { value: 'Омск', label: 'Омск' },
  { value: 'Новосибирск', label: 'Новосибирск' },
  { value: 'Тюмень', label: 'Тюмень' },
];

export default function MarketplacePage() {
  const { userId, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState<'material' | 'heavy_equipment'>('material');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCity, setActiveCity] = useState<string>('all');
  const [loadingData, setLoadingData] = useState(true);
  const [contactListing, setContactListing] = useState<Listing | null>(null);

  useEffect(() => {
    fetch('/api/marketplace/categories')
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (activeCity !== 'all') params.set('city', activeCity);

    async function load() {
      setLoadingData(true);
      try {
        const r = await fetch(`/api/marketplace/listings?${params}`);
        const data: Listing[] = await r.json();
        if (!cancelled) {
          setListings(data);
          setLoadingData(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadingData(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeCategory, activeCity]);

  const tabCategories = categories.filter((c) => c.type === activeTab);

  const filteredListings = listings.filter((l) => {
    const catMatch = activeCategory === 'all' || l.category?.name === categories.find((c) => c.slug === activeCategory)?.name;
    const typeMatch = l.category?.type === activeTab;
    return typeMatch && (activeCategory === 'all' || catMatch);
  });

  // Mark the cheapest listing per category as "best"
  const bestIds = new Set<number>();
  const priceByCategory: Record<string, number> = {};
  for (const l of filteredListings) {
    const slug = l.category?.name ?? '';
    if (priceByCategory[slug] === undefined || l.price < priceByCategory[slug]) {
      priceByCategory[slug] = l.price;
    }
  }
  for (const l of filteredListings) {
    const slug = l.category?.name ?? '';
    if (l.price === priceByCategory[slug]) {
      bestIds.add(l.id);
      break; // only first best per page if all categories shown
    }
  }
  // More precise: first cheapest per category
  const markedBest = new Set<string>();
  const bestIdsPerCategory = new Set<number>();
  for (const l of filteredListings) {
    const slug = l.category?.name ?? '';
    if (!markedBest.has(slug) && l.price === priceByCategory[slug]) {
      bestIdsPerCategory.add(l.id);
      markedBest.add(slug);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store size={22} className="text-brand-500" />
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">Маркетплейс</h1>
            </div>
            {!authLoading && !userId && (
              <Link
                href="/auth/login"
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                Войти
              </Link>
            )}
            {!authLoading && userId && (
              <Link
                href="/supplier"
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                Стать поставщиком
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 dark:border-dark-border">
            {([
              { value: 'material' as const, label: 'Материалы' },
              { value: 'heavy_equipment' as const, label: 'Спецтехника' },
            ]).map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setActiveCategory('all'); }}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.value
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-gray-400 dark:text-dark-muted hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-3">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-border'
            }`}
          >
            Все
          </button>
          {tabCategories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === cat.slug
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-border'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* City filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-gray-400 shrink-0" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CITIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveCity(c.value)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCity === c.value
                    ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listings */}
        {loadingData ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 animate-pulse">
                <div className="h-4 bg-gray-100 dark:bg-dark-border rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-dark-border rounded-full w-1/2 mb-4" />
                <div className="h-8 bg-gray-100 dark:bg-dark-border rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mb-4">
              <Store size={28} className="text-gray-300 dark:text-dark-border" />
            </div>
            <p className="text-gray-500 dark:text-dark-muted font-medium">
              Предложений пока нет
            </p>
            <p className="text-sm text-gray-400 dark:text-dark-muted mt-1">
              Станьте первым поставщиком в этой категории
            </p>
            <Link
              href="/auth/register"
              className="mt-4 px-6 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-colors"
            >
              Стать поставщиком
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.listing_id}
                listing={listing}
                isBest={bestIdsPerCategory.has(listing.id)}
                onContact={setContactListing}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {filteredListings.length > 0 && (
          <div className="mt-8 bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-5 text-center border border-brand-100 dark:border-brand-800/30">
            <p className="font-semibold text-gray-800 dark:text-white mb-1">Вы поставщик?</p>
            <p className="text-sm text-gray-500 dark:text-dark-muted mb-3">
              Разместите своё предложение бесплатно
            </p>
            <Link
              href="/auth/register"
              className="inline-block px-6 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-colors"
            >
              Зарегистрироваться как поставщик
            </Link>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      <ContactModal
        listing={contactListing}
        isLoggedIn={Boolean(userId)}
        onClose={() => setContactListing(null)}
      />
    </div>
  );
}
