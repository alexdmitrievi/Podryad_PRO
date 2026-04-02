'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star, MapPin, Users, CheckCircle2, ArrowLeft, ArrowRight,
  Shield, Package, ChevronRight,
} from 'lucide-react';

interface PublicSupplier {
  id: string;
  company_name: string;
  contact_name: string;
  city: string;
  delivery_available: boolean;
  is_verified: boolean;
  worker_type: 'individual' | 'crew';
  crew_size: number;
  rating: number;
  completed_orders: number;
  description: string | null;
  name: string;
}

interface PublicListing {
  listing_id: string;
  title: string;
  description: string | null;
  display_price: number | null;
  price_unit: string;
  city: string;
  listing_type: string | null;
  category_slug: string | null;
  images: string[];
  rating: number;
  orders_count: number;
  is_priority: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
}

export default function SupplierProfilePage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<PublicSupplier | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/suppliers/${supplierId}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json() as { supplier: PublicSupplier; listings: PublicListing[]; reviews: Review[] };
        setSupplier(data.supplier);
        setListings(data.listings);
        setReviews(data.reviews);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [supplierId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 dark:text-dark-muted text-lg">Профиль не найден</p>
        <Link href="/" className="text-brand-500 hover:underline text-sm">На главную</Link>
      </div>
    );
  }

  const isCrew = supplier.worker_type === 'crew';
  const portfolioImages = listings.flatMap((l) => l.images ?? []).slice(0, 9);
  const minPrice = listings.length > 0
    ? Math.min(...listings.map((l) => l.display_price ?? Infinity).filter((p) => p !== Infinity))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-24">
      {/* Back */}
      <div className="sticky top-0 z-30 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <span className="font-bold text-gray-900 dark:text-white truncate">{supplier.name}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Hero card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-xl text-gray-900 dark:text-white">{supplier.name}</h1>
                {isCrew && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2.5 py-0.5 rounded-full">
                    <Users size={10} /> Бригада
                  </span>
                )}
                {supplier.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Проверен
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-dark-muted flex-wrap">
                <span className="flex items-center gap-1">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  {supplier.rating > 0 ? supplier.rating.toFixed(1) : '—'}
                </span>
                <span>·</span>
                <span>{supplier.completed_orders} заказов</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {supplier.city}
                </span>
                {isCrew && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {supplier.crew_size} чел.
                    </span>
                  </>
                )}
              </div>

              {supplier.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-muted leading-relaxed">
                  {supplier.description}
                </p>
              )}
            </div>
          </div>

          {minPrice !== null && (
            <div className="mt-3 text-brand-500 font-bold text-base">
              от {minPrice.toLocaleString('ru-RU')} ₽ / {listings[0]?.price_unit ?? 'ч.'}
              <span className="text-xs font-normal text-gray-400 dark:text-dark-muted ml-1">за человека</span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-dark-muted">
            <Shield size={13} className="text-brand-500 shrink-0" />
            Безопасная сделка — оплата после выполнения работ
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/app/order"
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          {isCrew ? 'Заказать бригаду' : 'Оформить заказ'}
          <ArrowRight size={16} />
        </Link>

        {/* Listings */}
        {listings.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-3">
              Услуги и цены
            </h2>
            <div className="space-y-2">
              {listings.map((listing) => (
                <div
                  key={listing.listing_id}
                  className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Package size={15} className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{listing.title}</p>
                      {listing.description && (
                        <p className="text-xs text-gray-400 dark:text-dark-muted truncate">{listing.description}</p>
                      )}
                    </div>
                  </div>
                  {listing.display_price != null && (
                    <div className="text-right shrink-0">
                      <span className="font-bold text-brand-500 text-sm">
                        {listing.display_price.toLocaleString('ru-RU')} ₽
                      </span>
                      <span className="text-xs text-gray-400 block">/ {listing.price_unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {portfolioImages.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-3">
              Портфолио
            </h2>
            <div className="grid grid-cols-3 gap-1.5">
              {portfolioImages.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-3">
              Отзывы
            </h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-4"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{r.customer_name}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-dark-border fill-current'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-dark-muted leading-relaxed">{r.comment}</p>
                  <p className="text-[11px] text-gray-300 dark:text-dark-muted mt-1.5">
                    {new Date(r.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to catalog */}
        <Link
          href="/catalog"
          className="flex items-center justify-center gap-1.5 text-sm text-brand-500 hover:underline py-2"
        >
          <ChevronRight size={14} className="rotate-180" />
          Все исполнители
        </Link>
      </div>
    </div>
  );
}
