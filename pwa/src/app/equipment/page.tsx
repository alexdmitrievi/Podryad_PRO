'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Truck, Shield, Star, Clock, ChevronRight, Phone, MessageCircle,
  CheckCircle2, UserCheck, ArrowRight, X
} from 'lucide-react';
import { showToast } from '@/components/ui/Toast';

interface EquipmentListing {
  listing_id: string;
  title: string;
  description?: string;
  display_price: number;
  price_unit: string;
  images?: string[];
  category_slug: string;
  discount_percent: number;
  includes_operator: boolean;
  year_manufactured?: number;
  min_rental_hours?: number;
  specs_json?: Record<string, string>;
  city: string;
}

interface InquiryState {
  item: EquipmentListing | null;
  open: boolean;
}

/* ── Category labels ─────────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
  excavator: 'Экскаватор', bulldozer: 'Бульдозер', crane: 'Автокран',
  'dump-truck': 'Самосвал', loader: 'Погрузчик', 'mini-loader': 'Мини-погрузчик',
  'concrete-mixer': 'Автобетоносмеситель', flatbed: 'Трал', compactor: 'Виброплита',
  generator: 'Генератор', other: 'Техника',
};

/* ── UTP benefits data ───────────────────────────────────────── */
const BENEFITS = [
  {
    icon: Star,
    color: 'from-amber-400 to-orange-500',
    title: '−20% от рыночной цены',
    desc: 'Собственная техника без посредников. Аренда напрямую от владельца дешевле любого рынка.',
  },
  {
    icon: Shield,
    color: 'from-green-400 to-emerald-600',
    title: 'Гарантия исправности',
    desc: 'Весь автопарк прошёл ТО. Технический паспорт, страховка и документы в порядке.',
  },
  {
    icon: UserCheck,
    color: 'from-blue-400 to-indigo-600',
    title: 'Оператор в комплекте',
    desc: 'Опытный машинист уже в цене. Без допрасходов, без головной боли с поиском.',
  },
  {
    icon: Clock,
    color: 'from-purple-400 to-violet-600',
    title: 'Быстрый выезд',
    desc: 'Подтверждение за 30 минут. Выезд на объект в день звонка — чаще всего.',
  },
];

/* ── Booking modal ───────────────────────────────────────────── */
type ContactMethod = 'phone' | 'MAX' | 'telegram';
const CONTACT_METHODS: { id: ContactMethod; label: string; icon: React.ReactNode; placeholder: string; inputType: string }[] = [
  { id: 'phone',    label: 'Телефон', icon: <Phone className="w-4 h-4" />,          placeholder: '+7 (999) 000-00-00', inputType: 'tel'  },
  { id: 'MAX',      label: 'MAX',     icon: <MessageCircle className="w-4 h-4" />,  placeholder: 'Номер телефона MAX',  inputType: 'tel'  },
  { id: 'telegram', label: 'Telegram',icon: <MessageCircle className="w-4 h-4" />,  placeholder: '@username',           inputType: 'text' },
];

function BookingModal({ item, onClose }: { item: EquipmentListing; onClose: () => void }) {
  const [method, setMethod] = useState<ContactMethod>('phone');
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const headingId = 'booking-modal-title';

  const originalPrice = Math.round(item.display_price / (1 - (item.discount_percent || 20) / 100));

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    document.body.style.overflow = 'hidden';
    // focus trap: move focus into modal
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>('button, input, textarea, [tabindex]');
    firstFocusable?.focus();
    return () => { document.removeEventListener('keydown', handle); document.body.style.overflow = ''; };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !contact.trim()) return;
    setLoading(true);
    try {
      const fullComment = comment.trim()
        ? `${item.title} | Комментарий: ${comment.trim()}`
        : item.title;
      const res = await fetch('/api/catalog-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.listing_id,
          item_title: `[Наша техника] ${fullComment}`,
          contact_method: method,
          contact_value: contact.trim(),
        }),
      });
      if (res.ok) { setDone(true); }
      else { showToast('Ошибка отправки. Попробуйте ещё раз.', 'error'); }
    } catch { showToast('Ошибка соединения', 'error'); }
    finally { setLoading(false); }
  }

  const currentMethod = CONTACT_METHODS.find(m => m.id === method)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="bg-white dark:bg-dark-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-brand-900 to-[#6C5CE7] p-5 text-white">
          <button
            onClick={onClose}
            aria-label="Закрыть диалог"
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center" aria-hidden="true">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/70">Заявка на аренду</p>
              <h3 id={headingId} className="font-bold text-base">{item.title}</h3>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-white/60 line-through text-sm">{originalPrice.toLocaleString('ru-RU')} ₽</span>
            <span className="text-xl font-bold">{item.display_price.toLocaleString('ru-RU')} ₽</span>
            <span className="text-sm text-white/70">/ {item.price_unit}</span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-green-400 text-brand-900 text-xs font-bold">
              −{item.discount_percent || 20}%
            </span>
          </div>
        </div>

        <div className="p-5">
          {!done ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact method */}
              <div className="flex gap-2" role="group" aria-label="Способ связи">
                {CONTACT_METHODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMethod(m.id); setContact(''); }}
                    aria-pressed={method === m.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all border-2 ${
                      method === m.id
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'border-gray-200 dark:border-dark-border text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                required
                type={currentMethod.inputType}
                placeholder={currentMethod.placeholder}
                aria-label={`${currentMethod.label}: контактные данные`}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border dark:bg-dark-bg dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-shadow"
              />
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Дата, объём работ, адрес объекта (необязательно)"
                aria-label="Комментарий к заявке"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border dark:bg-dark-bg dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-shadow"
              />
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-brand-500 cursor-pointer"
                />
                <span className="text-xs text-gray-500 dark:text-dark-muted">
                  Согласен(а) на обработку персональных данных в соответствии с{' '}
                  <Link href="/privacy" className="text-brand-500 hover:underline" target="_blank">152-ФЗ</Link>
                </span>
              </label>
              <button
                type="submit"
                disabled={!consent || !contact.trim() || loading}
                className="btn-shine w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" /> Отправляем…</>
                  : <><ArrowRight className="w-4 h-4" aria-hidden="true" /> Оставить заявку</>}
              </button>
            </form>
          ) : (
            <div className="py-8 text-center space-y-3" role="status" aria-live="polite">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" aria-hidden="true" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Заявка принята!</h4>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                Менеджер свяжется с вами в течение 30 минут для уточнения деталей.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Equipment card ──────────────────────────────────────────── */
function EquipmentCard({ item, onOrder }: { item: EquipmentListing; onOrder: (item: EquipmentListing) => void }) {
  const originalPrice = Math.round(item.display_price / (1 - (item.discount_percent || 20) / 100));
  const topSpecs = Object.entries(item.specs_json || {}).slice(0, 3);

  return (
    <article className="group bg-white dark:bg-dark-card rounded-3xl shadow-card border border-gray-100 dark:border-dark-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
      {/* Photo */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 dark:from-dark-bg to-gray-200 dark:to-dark-border overflow-hidden">
        {item.images?.[0] ? (
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
            <Truck className="w-20 h-20 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {item.discount_percent > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow">
              −{item.discount_percent}%
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700">
            {CATEGORY_LABELS[item.category_slug] || item.category_slug}
          </span>
        </div>
        {item.includes_operator && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500 text-white text-xs font-medium shadow">
            <UserCheck className="w-3 h-3" aria-hidden="true" /> Оператор
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        {/* Title + year */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{item.title}</h3>
          {item.year_manufactured && (
            <span className="text-xs text-gray-400 dark:text-dark-muted flex-shrink-0 mt-0.5">{item.year_manufactured} г.</span>
          )}
        </div>

        {/* Specs */}
        {topSpecs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topSpecs.map(([k, v]) => (
              <span key={k} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text">
                {k}: <span className="font-medium">{v}</span>
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-end gap-2 pt-1 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 dark:text-dark-muted line-through">{originalPrice.toLocaleString('ru-RU')} ₽</p>
            <p className="text-2xl font-bold text-brand-500">{item.display_price.toLocaleString('ru-RU')} ₽</p>
          </div>
          <div className="pb-0.5">
            <p className="text-sm text-gray-500 dark:text-dark-muted">{item.price_unit}</p>
            {item.min_rental_hours && item.min_rental_hours > 1 && (
              <p className="text-xs text-gray-400 dark:text-dark-muted">мин. {item.min_rental_hours} ч</p>
            )}
          </div>
          <span className="ml-auto self-end px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            экономия {(originalPrice - item.display_price).toLocaleString('ru-RU')} ₽
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => onOrder(item)}
          className="btn-shine w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          Забронировать <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<InquiryState>({ item: null, open: false });
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/listings/public?type=own_equipment');
      const data = await res.json();
      setItems(data.listings || []);
    } catch { /* show empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category_slug)))];
  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category_slug === activeCategory);

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-brand-900/95 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Подряд PRO — на главную">
            <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-xl opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-[16px] font-extrabold text-white font-heading tracking-tight">
              Подряд <span className="text-brand-400">PRO</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-white/50 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
              Собственная техника
            </span>
            <Link
              href="/#lead-form"
              className="btn-shine ml-3 bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all hover:shadow-glow cursor-pointer"
            >
              Оставить заявку
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-[#1a2550] to-[#2d1b69] text-white">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none select-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #2F5BFF 0%, transparent 60%), radial-gradient(circle at 80% 20%, #6C5CE7 0%, transparent 50%)' }}
          aria-hidden="true"
        />
        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
              Собственный автопарк Подряд PRO
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4 font-heading">
              Аренда техники<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">
                на 20% дешевле рынка
              </span>
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Наша техника — ваша экономия. Никаких посредников: прямая аренда у владельца с гарантией исправности, техпаспортом и возможностью выезда в день заявки.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#fleet"
                className="btn-shine inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold cursor-pointer transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Посмотреть технику <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-surface dark:bg-dark-bg"
          style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }} aria-hidden="true" />
      </section>

      {/* ── UTP Benefits ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 font-heading">
            Почему выгодно арендовать у нас
          </h2>
          <p className="text-gray-500 dark:text-dark-muted">Четыре причины, которые говорят сами за себя</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b, i) => (
            <div key={i} className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-card border border-gray-100 dark:border-dark-border flex flex-col gap-3 hover:shadow-lg transition-shadow">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
                <b.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{b.title}</h3>
              <p className="text-xs text-gray-500 dark:text-dark-muted leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Savings calculator block ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none select-none"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 70%)' }} />
          <div className="relative grid sm:grid-cols-3 gap-6 items-center">
            <div className="sm:col-span-2">
              <h3 className="text-xl font-bold mb-1">Реальная экономия</h3>
              <p className="text-green-100 text-sm mb-4">Пример: экскаватор на 5 дней</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-green-200">Рыночная цена</p>
                  <p className="text-2xl font-bold line-through text-green-200">125 000 ₽</p>
                </div>
                <ArrowRight className="w-5 h-5 text-green-200" />
                <div className="text-center">
                  <p className="text-xs text-green-100">Ваша цена</p>
                  <p className="text-3xl font-extrabold">100 000 ₽</p>
                </div>
                <div className="ml-auto text-center bg-white/20 rounded-2xl px-4 py-3">
                  <p className="text-xs text-green-100">Экономия</p>
                  <p className="text-2xl font-extrabold">25 000 ₽</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {['Один объект → экономия 25 000 ₽', 'Три объекта → экономия 75 000 ₽', 'В год → экономия >300 000 ₽'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-200 flex-shrink-0" />
                  <span className="text-green-100">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Fleet ────────────────────────────────────────────── */}
      <section id="fleet" className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-heading">Наш автопарк</h2>
            <p className="text-gray-500 dark:text-dark-muted mt-1">Вся техника в собственности · скидка 20% для всех</p>
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по категории">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                    activeCategory === cat
                      ? 'bg-brand-500 text-white'
                      : 'bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text border border-gray-200 dark:border-dark-border hover:border-brand-500'
                  }`}
                >
                  {cat === 'all' ? 'Все' : (CATEGORY_LABELS[cat] || cat)}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Загрузка техники" aria-busy="true">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-dark-card rounded-3xl overflow-hidden border border-gray-100 dark:border-dark-border animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-dark-border" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-dark-border rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-dark-bg rounded-full w-1/2" />
                  <div className="h-8 bg-gray-200 dark:bg-dark-border rounded-full w-2/5 mt-2" />
                  <div className="h-9 bg-gray-100 dark:bg-dark-bg rounded-xl mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(item => (
              <EquipmentCard key={item.listing_id} item={item} onOrder={item => setInquiry({ item, open: true })} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-card">
            <Truck className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-gray-500 dark:text-dark-muted">
              {activeCategory === 'all' ? 'Техника скоро появится' : 'В этой категории пока нет техники'}
            </h3>
            <p className="text-sm text-gray-400 dark:text-dark-muted mt-2 mb-6">
              {activeCategory === 'all'
                ? 'Автопарк пополняется. Оставьте заявку — мы подберём нужную технику.'
                : 'Попробуйте другую категорию или оставьте заявку.'}
            </p>
            <Link
              href="/#lead-form"
              className="btn-shine inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              Оставить заявку
            </Link>
          </div>
        )}
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-900 to-[#2d1b69] text-white py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 font-heading">
            Нужна техника под конкретный объект?
          </h2>
          <p className="text-white/70 mb-8">
            Оставьте заявку — подберём, рассчитаем стоимость и отправим менеджера за 30 минут.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/#lead-form"
              className="btn-shine inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold cursor-pointer transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Оставить заявку <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/catalog/equipment"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Вся техника в каталоге
            </Link>
          </div>
        </div>
      </section>

      {/* Booking modal */}
      {inquiry.open && inquiry.item && (
        <BookingModal item={inquiry.item} onClose={() => setInquiry({ item: null, open: false })} />
      )}
    </div>
  );
}
