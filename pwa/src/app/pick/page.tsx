'use client';

import { useState } from 'react';
import { Search, Star, Briefcase, Crown, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';

const WORK_TYPES = [
  { value: 'грузчики',     label: 'Грузчики',       emoji: '💪' },
  { value: 'уборка',       label: 'Уборка',         emoji: '🧹' },
  { value: 'стройка',      label: 'Строительство',  emoji: '🏗' },
  { value: 'разнорабочие', label: 'Разнорабочие',   emoji: '🔧' },
  { value: 'другое',       label: 'Другое',         emoji: '📋' },
];

interface PickedWorker {
  name: string;
  rating: number;
  jobs_count: number;
  skills: string;
  is_vip: boolean;
}

export default function PickPage() {
  const { loading: authLoading, userId } = useAuth();
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState('грузчики');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workers, setWorkers] = useState<PickedWorker[]>([]);
  const [paymentUrl, setPaymentUrl] = useState('');

  const handlePick = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWorkers([]);
    setPaymentUrl('');

    try {
      const res = await fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: description.trim(),
          work_type: workType,
        }),
      });

      const data = (await res.json()) as {
        payment_url?: string;
        workers?: PickedWorker[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка подбора');
      }

      if (data.workers && data.workers.length > 0) {
        setWorkers(data.workers);
      }

      if (data.payment_url) {
        setPaymentUrl(data.payment_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подобрать исполнителей');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pt-16 pb-20">
      <PageHeader
        title="Подбор исполнителей"
        subtitle="ИИ подберёт лучших под вашу задачу"
        backHref="/"
      />

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {authLoading ? (
          <>
            <SkeletonBlock className="h-[200px] rounded-card" />
            <div className="space-y-5">
              <SkeletonBlock className="h-[44px] rounded-card" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-[48px] rounded-2xl" />
                ))}
              </div>
              <SkeletonBlock className="h-[120px] rounded-2xl" />
              <SkeletonBlock className="h-[56px] rounded-2xl" />
            </div>
          </>
        ) : !userId ? (
          <div className="text-center py-16 px-6">
            <p className="text-5xl mb-4">🔒</p>
            <p className="font-bold text-lg text-gray-800">Требуется авторизация</p>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-2">
              Войдите в систему, чтобы воспользоваться подбором
            </p>
          </div>
        ) : workers.length > 0 ? (
          /* ─── Results ─── */
          <>
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 text-center animate-fade-in">
              <Sparkles size={28} className="text-brand-500 mx-auto mb-2" />
              <h2 className="font-bold text-brand-900 text-lg">ТОП-3 исполнителя</h2>
              <p className="text-sm text-brand-700 mt-1">
                Лучшие кандидаты для вашей задачи
              </p>
            </div>

            <div className="space-y-3">
              {workers.map((w, i) => (
                <div
                  key={i}
                  className="
                    bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card border border-gray-100 dark:border-dark-border
                    hover:shadow-card-hover transition-all duration-300
                    flex items-center gap-4 animate-fade-in
                  "
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Rank */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                      {['🥇', '🥈', '🥉'][i] ?? i + 1}
                    </div>
                    {w.is_vip && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <Crown size={11} className="text-amber-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white truncate">{w.name}</span>
                      {w.is_vip && (
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-100">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 text-sm text-amber-600 font-semibold">
                        <Star size={13} fill="currentColor" />
                        {w.rating.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                        <Briefcase size={13} />
                        {w.jobs_count} заказов
                      </span>
                    </div>
                    {w.skills && (
                      <p className="text-xs text-gray-400 mt-1.5 truncate">{w.skills}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {paymentUrl && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  w-full flex items-center justify-center gap-2.5
                  bg-brand-500 text-white font-bold py-4 rounded-2xl text-base
                  hover:bg-brand-600 active:scale-[0.98]
                  transition-all duration-200 shadow-sm shadow-brand-500/20
                "
              >
                Оплатить подбор — 1 000 &#8381;
              </a>
            )}

            <button
              onClick={() => { setWorkers([]); setPaymentUrl(''); setDescription(''); }}
              className="
                w-full flex items-center justify-center gap-2
                bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-2xl text-sm
                hover:bg-gray-200 active:scale-[0.98] transition-all duration-200
              "
            >
              Подобрать заново
            </button>
          </>
        ) : (
          /* ─── Form ─── */
          <>
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-brand-500 via-[#0077b5] to-[#006699] rounded-2xl p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Search size={28} />
                  <Sparkles size={20} />
                </div>
                <h2 className="text-2xl font-bold">Подбор исполнителей</h2>
                <p className="text-white/80 text-sm mt-1">
                  ИИ подберёт ТОП-3 лучших исполнителей под вашу задачу
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">1 000</span>
                  <span className="text-lg">&#8381;</span>
                </div>
              </div>
            </div>

            <form onSubmit={handlePick} className="space-y-5">
              {/* Work type */}
              <fieldset>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Тип работы
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WORK_TYPES.map((wt) => (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => setWorkType(wt.value)}
                      className={`
                        flex items-center gap-2 px-3.5 py-3 rounded-2xl text-sm font-medium
                        transition-all duration-200 border active:scale-[0.98]
                        ${workType === wt.value
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-white dark:bg-dark-card text-gray-600 border-gray-200 dark:border-dark-border hover:border-brand-200 hover:bg-brand-50'}
                      `}
                    >
                      <span className="text-base">{wt.emoji}</span>
                      {wt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Description */}
              <fieldset>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Опишите задачу
                  <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Например: Нужны 2 грузчика для переезда из 3-комнатной квартиры на 5 этаже без лифта..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  className="
                    w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card
                    focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                    outline-none transition-all duration-200 text-sm resize-none dark:text-white
                    placeholder:text-gray-300
                  "
                />
              </fieldset>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-2xl border border-red-100 animate-fade-in">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full flex items-center justify-center gap-2.5
                  bg-brand-500 text-white font-bold py-4 rounded-2xl text-base
                  hover:bg-brand-600 active:scale-[0.98]
                  transition-all duration-200 shadow-sm shadow-brand-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Подбираем...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Подобрать исполнителей
                  </>
                )}
              </button>

              <p className="text-gray-400 text-xs text-center">
                Оплата производится после просмотра результатов подбора
              </p>
            </form>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
