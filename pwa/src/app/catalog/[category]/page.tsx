'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Spinner from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';

type ContactMethod = 'phone' | 'telegram';

interface CatalogItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  unit: string;
  image?: string;
}

interface Listing {
  listing_id: string;
  title: string;
  description?: string;
  display_price: number;
  price_unit: string;
  images?: string[];
  category_slug?: string;
}

/* ── Static labor services ────────────────────────────────────── */

const LABOR_SERVICES: CatalogItem[] = [
  { id: 'l-1', title: 'Грузчики', description: 'Погрузка, разгрузка, перенос мебели и стройматериалов. Бригады от 2 человек.', price: 350, unit: 'ч' },
  { id: 'l-2', title: 'Разнорабочие', description: 'Подсобные работы на стройке, уборка территории, демонтаж.', price: 300, unit: 'ч' },
  { id: 'l-3', title: 'Благоустройство участков', description: 'Покос травы, уборка мусора, планировка территории, мощение.', price: 250, unit: 'ч' },
  { id: 'l-4', title: 'Строители / ремонт', description: 'Кладка, штукатурка, плитка, электрика, сантехника. Бригады с опытом от 5 лет.', price: 500, unit: 'ч' },
  { id: 'l-5', title: 'Землекопы', description: 'Копка траншей, ям, котлованов вручную. Работа в стеснённых условиях.', price: 350, unit: 'ч' },
  { id: 'l-6', title: 'Дворники / уборщики', description: 'Уборка подъездов, территории, мытьё окон и фасадов.', price: 250, unit: 'ч' },
];

const CATEGORY_META: Record<string, { title: string; subtitle: string; icon: string; apiType?: string }> = {
  labor: { title: 'Рабочая сила', subtitle: 'Бригады от 2 до 15 человек', icon: '👷' },
  equipment: { title: 'Аренда техники', subtitle: 'От тяжёлой до садовой техники', icon: '🚜', apiType: 'equipment_rental' },
  materials: { title: 'Стройматериалы', subtitle: 'Доставка по городу', icon: '📦', apiType: 'material' },
};

/* ── Order modal ──────────────────────────────────────────────── */

function OrderModal({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const [method, setMethod] = useState<ContactMethod>('phone');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const stableOnClose = useCallback(onClose, [onClose]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') stableOnClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [stableOnClose]);

  // Focus trap: keep Tab within modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !contact.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/catalog-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          item_title: item.title,
          contact_method: method,
          contact_value: contact.trim(),
        }),
      });
      if (!res.ok) throw new Error('API error');
      setSubmitted(true);
    } catch {
      showToast('Ошибка при отправке. Попробуйте ещё раз.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Заказать ${item.title}`}>
      <div
        ref={modalRef}
        className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8 shadow-xl relative animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-muted/30 transition-colors text-gray-500 dark:text-dark-muted"
        >
          ✕
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="confetti-container">
              {[...Array(8)].map((_, i) => <span key={i} className="confetti-dot" />)}
            </div>
            <div className="success-icon mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600 success-check"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Заявка отправлена!</h3>
            <p className="text-gray-500 dark:text-dark-muted text-sm">Мы свяжемся с вами в течение 15 минут с предложением и ссылкой на оплату.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Заказать</h3>
            <p className="text-gray-500 dark:text-dark-muted text-sm mb-6">{item.title} — от {item.price.toLocaleString('ru-RU')} ₽/{item.unit}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contact method selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Куда отправить предложение и ссылку на оплату?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'phone' as ContactMethod, label: 'Телефон' },
                    { key: 'telegram' as ContactMethod, label: 'Telegram' },

                  ]).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => { setMethod(m.key); setContact(''); }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        method === m.key
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:border-brand-500'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact input */}
              <div>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={
                    method === 'phone' ? '+7 (___) ___-__-__' : '@username'
                  }
                  required
                  className="w-full border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-dark-bg placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                />
              </div>

              {/* 152-ФЗ consent */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 dark:border-dark-border text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-xs text-gray-500 dark:text-dark-muted leading-relaxed">
                  Я даю согласие на обработку персональных данных в соответствии
                  с&nbsp;
                  <a href="/privacy" className="text-brand-500 underline" target="_blank">
                    Федеральным законом №152-ФЗ
                  </a>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !consent || !contact.trim()}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-glow-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner className="w-5 h-5 text-white" /> Отправляем...</> : 'Получить предложение'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function CatalogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const [category, setCategory] = useState<string>('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [orderItem, setOrderItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { category: cat } = await params;
      if (cancelled) return;
      setCategory(cat);

      const meta = CATEGORY_META[cat];
      if (!meta) {
        setItems([]);
        setLoading(false);
        return;
      }

      if (cat === 'labor') {
        setItems(LABOR_SERVICES);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/listings/public?type=${meta.apiType}`);
        const d = await res.json();
        if (cancelled) return;
        const listings: Listing[] = d.listings ?? [];
        setItems(
          listings.map((l) => ({
            id: l.listing_id,
            title: l.title,
            description: l.description || undefined,
            price: l.display_price,
            unit: l.price_unit,
            image: l.images?.[0],
          }))
        );
      } catch {
        if (cancelled) return;
        if (cat === 'equipment') {
          setItems([
            { id: 'f-1', title: 'Экскаватор-погрузчик', description: 'JCB 3CX, Cat 428. Копка, планировка, погрузка.', price: 2500, unit: 'час' },
            { id: 'f-2', title: 'Мини-погрузчик', description: 'Bobcat S175, МКСМ-800. Работа в стеснённых условиях.', price: 1800, unit: 'час' },
            { id: 'f-3', title: 'Виброплита', description: 'Трамбовка грунта, песка, щебня. Вес от 60 до 300 кг.', price: 800, unit: 'сутки' },
            { id: 'f-4', title: 'Бензопила / кусторез', description: 'Stihl, Husqvarna. Валка деревьев, обрезка кустов.', price: 500, unit: 'сутки' },
            { id: 'f-5', title: 'Газонокосилка', description: 'Бензиновая и электрическая. Покос от 1 сотки.', price: 400, unit: 'сутки' },
          ]);
        } else {
          setItems([
            { id: 'f-m1', title: 'Бетон М300 В22.5', description: 'Готовая бетонная смесь с доставкой миксером.', price: 5200, unit: 'м³' },
            { id: 'f-m2', title: 'Щебень фр. 5-20', description: 'Гранитный щебень для фундаментов и дорожек.', price: 1800, unit: 'тонна' },
            { id: 'f-m3', title: 'Песок мытый', description: 'Речной мытый песок для кладки и стяжки.', price: 900, unit: 'тонна' },
            { id: 'f-m4', title: 'Битум БНД 60/90', description: 'Дорожный битум для асфальтирования и гидроизоляции.', price: 32000, unit: 'тонна' },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [params]);

  const meta = CATEGORY_META[category];

  if (!category) return null;

  if (!meta) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Категория не найдена</h1>
          <Link href="/" className="text-brand-500 hover:underline">Вернуться на главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Подряд PRO" width={36} height={36} className="rounded-lg" />
              <span className="text-lg font-extrabold text-brand-900 dark:text-white font-heading">Подряд PRO</span>
            </Link>
          </div>
          <Link
            href="/"
            className="text-brand-500 hover:text-brand-600 font-semibold text-sm flex items-center gap-1 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            На главную
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section
        className="section-gradient py-14 sm:py-16 px-4"
      >
        <div className="max-w-6xl mx-auto text-center">
          <span className="text-4xl mb-4 block">{meta.icon}</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading mb-3">
            {meta.title}
          </h1>
          <p className="text-white/60 text-lg">{meta.subtitle}</p>
        </div>
      </section>

      {/* Items grid */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-dark-border animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-6" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-grid">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-dark-card rounded-2xl p-6 sm:p-8 shadow-card border border-gray-100 dark:border-dark-border card-lift flex flex-col"
                >
                  <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 bg-gray-100">
                    {item.image ? (
                      <Image src={item.image} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/5 to-violet/5">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-300" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-heading line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-gray-500 text-sm mb-4 leading-relaxed flex-1 line-clamp-3">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-dark-border">
                    <span className="text-lg font-extrabold text-brand-500">
                      от {item.price.toLocaleString('ru-RU')} ₽/{item.unit}
                    </span>
                  </div>
                  <button
                    onClick={() => setOrderItem(item)}
                    className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all duration-200 hover:shadow-glow-hover cursor-pointer btn-press"
                  >
                    Заказать
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg">Товары пока не добавлены</p>
              <a href="/catalog" className="inline-block text-sm text-brand-500 hover:text-brand-600 font-semibold transition-colors">← Вернуться в каталог</a>
            </div>
          )}
        </div>
      </section>

      {/* Order modal */}
      {orderItem && <OrderModal item={orderItem} onClose={() => setOrderItem(null)} />}
    </div>
  );
}
