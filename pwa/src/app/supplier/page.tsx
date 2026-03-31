'use client';

import { useEffect, useState } from 'react';
import { Plus, Eye, Phone, Package, Pencil, Trash2, Store, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ListingForm from '@/components/ListingForm';
import type { Listing } from '@/components/ListingCard';

type Category = {
  slug: string;
  name: string;
  type: string;
  unit: string;
  icon: string;
};

type Supplier = {
  id: string;
  company_name: string;
  contact_name: string;
  city: string;
  delivery_available: boolean;
  is_verified: boolean;
};

type Stats = {
  total: number;
  active: number;
  views: number;
  contacts: number;
};

type MyData = {
  supplier: Supplier;
  listings: Listing[];
  stats: Stats;
};

export default function SupplierPage() {
  const router = useRouter();
  const { userId, role, loading: authLoading } = useAuth();
  const [data, setData] = useState<MyData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.push('/auth/login');
      return;
    }
    if (role && role !== 'supplier') {
      router.push('/');
      return;
    }
  }, [userId, role, authLoading, router]);

  async function load() {
    setLoading(true);
    try {
      const [myRes, catRes] = await Promise.all([
        fetch('/api/marketplace/my', { credentials: 'include' }),
        fetch('/api/marketplace/categories'),
      ]);
      if (myRes.status === 403 || myRes.status === 401) {
        router.push('/auth/login');
        return;
      }
      const [myData, catData] = await Promise.all([myRes.json(), catRes.json()]);
      setData(myData as MyData);
      setCategories(catData as Category[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

  async function handleDelete(listingId: string) {
    setDeletePending(true);
    try {
      await fetch(`/api/marketplace/listings/${listingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setDeleteId(null);
      await load();
    } catch {
      /* ignore */
    } finally {
      setDeletePending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats;
  const supplier = data?.supplier;
  const listings = data?.listings ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-30 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={20} className="text-brand-500" />
            <span className="font-extrabold text-gray-900 dark:text-white">Кабинет поставщика</span>
          </div>
          <Link href="/marketplace" className="text-xs text-brand-500 hover:underline font-medium">
            Витрина →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Supplier info */}
        {supplier && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{supplier.company_name}</h2>
                <p className="text-sm text-gray-500 dark:text-dark-muted mt-0.5">{supplier.contact_name} · {supplier.city}</p>
                {supplier.is_verified && (
                  <span className="inline-block mt-1 text-[11px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                    ✓ Верифицирован
                  </span>
                )}
              </div>
              <Link
                href="/marketplace"
                className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
              >
                Витрина <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Предложений', value: stats.total, icon: Package },
              { label: 'Активных', value: stats.active, icon: Store },
              { label: 'Просмотров', value: stats.views, icon: Eye },
              { label: 'Контактов', value: stats.contacts, icon: Phone },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-3 text-center">
                  <Icon size={16} className="text-brand-500 mx-auto mb-1" />
                  <div className="text-xl font-extrabold text-gray-900 dark:text-white">{s.value}</div>
                  <div className="text-[10px] text-gray-400 dark:text-dark-muted leading-tight">{s.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add button */}
        {!showForm && !editListing && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} />
            Добавить предложение
          </button>
        )}

        {/* Add/Edit form */}
        {(showForm || editListing) && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              {editListing ? 'Редактировать предложение' : 'Новое предложение'}
            </h3>
            <ListingForm
              categories={categories}
              supplierCity={supplier?.city ?? 'Омск'}
              initial={editListing}
              onSuccess={async () => {
                setShowForm(false);
                setEditListing(null);
                await load();
              }}
              onCancel={() => { setShowForm(false); setEditListing(null); }}
            />
          </div>
        )}

        {/* Listings */}
        <div>
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wider">
            Мои предложения
          </h3>
          {listings.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-dark-muted">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет предложений. Добавьте первое!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.listing_id}
                  className={`bg-white dark:bg-dark-card rounded-2xl border p-4 transition-colors ${
                    listing.is_active
                      ? 'border-gray-100 dark:border-dark-border'
                      : 'border-gray-100 dark:border-dark-border opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-400 dark:text-dark-muted">
                          {(listing.category as { icon?: string })?.icon} {(listing.category as { name?: string })?.name}
                        </span>
                        {!listing.is_active && (
                          <span className="text-[10px] bg-gray-100 dark:bg-dark-border text-gray-400 px-2 py-0.5 rounded-full">
                            Неактивно
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {listing.title}
                      </h4>
                      <p className="text-brand-500 font-bold text-sm mt-0.5">
                        {listing.price.toLocaleString('ru-RU')} ₽ / {(listing.category as { unit?: string })?.unit}
                      </p>
                    </div>

                    {deleteId === listing.listing_id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                          disabled={deletePending}
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleDelete(listing.listing_id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                          disabled={deletePending}
                        >
                          {deletePending ? '...' : 'Удалить'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditListing(listing); setShowForm(false); }}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors cursor-pointer"
                          title="Редактировать"
                        >
                          <Pencil size={14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => setDeleteId(listing.listing_id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 dark:text-dark-muted">
                    <span className="flex items-center gap-1"><Eye size={11} /> {listing.views_count}</span>
                    <span className="flex items-center gap-1"><Phone size={11} /> {listing.contacts_count}</span>
                    <span>📍 {listing.city}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
