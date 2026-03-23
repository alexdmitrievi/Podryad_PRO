'use client';

import { useState, useEffect } from 'react';
import { Crown, Clock, Star, Users, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';

interface VipStatus {
  is_vip: boolean;
  vip_expires_at?: string;
}

const VIP_BENEFITS = [
  {
    icon: Clock,
    title: 'Ранний доступ к заказам',
    description: '30 минут до остальных исполнителей',
  },
  {
    icon: Star,
    title: 'Приоритет при отборе',
    description: 'Ваша заявка рассматривается первой',
  },
  {
    icon: Crown,
    title: 'VIP-значок в профиле',
    description: 'Золотой значок подтверждает ваш статус',
  },
  {
    icon: Users,
    title: 'Выделение в каталоге исполнителей',
    description: 'Вы отображаетесь выше в списке',
  },
];

export default function VipPage() {
  const { loading: authLoading, userId } = useAuth();
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    fetch('/api/workers/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setVipStatus({
            is_vip: Boolean(data.is_vip),
            vip_expires_at: data.vip_expires_at ?? undefined,
          });
        }
      })
      .catch(() => {});
  }, [userId]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/vip/subscribe', {
        method: 'POST',
        credentials: 'include',
      });

      const data = (await res.json()) as { payment_url?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка оформления подписки');
      }

      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось оформить подписку');
    } finally {
      setLoading(false);
    }
  };

  const isVip = vipStatus?.is_vip ?? false;
  const vipExpires = vipStatus?.vip_expires_at
    ? new Date(vipStatus.vip_expires_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pt-16 pb-20">
      <PageHeader
        title="VIP-подписка"
        subtitle="Преимущества для исполнителей"
        backHref="/"
      />

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {authLoading ? (
          <>
            <SkeletonBlock className="h-[200px] rounded-card" />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-[72px] rounded-card" />
            ))}
          </>
        ) : !userId ? (
          <div className="text-center py-16 px-6">
            <p className="text-5xl mb-4">🔒</p>
            <p className="font-bold text-lg text-gray-800">Требуется авторизация</p>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-2">
              Войдите в систему, чтобы оформить VIP-подписку
            </p>
          </div>
        ) : (
          <>
            {/* VIP Active Badge */}
            {isVip && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-amber-900">
                    Вы VIP до {vipExpires}
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Все преимущества активны
                  </p>
                </div>
              </div>
            )}

            {/* Hero Card */}
            <div className="relative bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-2xl p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={28} />
                  <Sparkles size={20} />
                </div>
                <h2 className="text-2xl font-bold">VIP-статус</h2>
                <p className="text-white/80 text-sm mt-1">
                  Станьте приоритетным исполнителем
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">1 000</span>
                  <span className="text-lg">&#8381;/месяц</span>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wide px-1">
                Преимущества
              </h3>
              {VIP_BENEFITS.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={i}
                    className="
                      bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card border border-gray-100 dark:border-dark-border
                      hover:shadow-card-hover transition-all duration-300
                      flex items-start gap-4 animate-fade-in
                    "
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{benefit.title}</p>
                      <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-2xl border border-red-100 animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Subscribe Button */}
            {!isVip && (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="
                  w-full flex items-center justify-center gap-2.5
                  bg-amber-500 text-white font-bold py-4 rounded-2xl text-base
                  hover:bg-amber-600 active:scale-[0.98]
                  transition-all duration-200 shadow-sm shadow-amber-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Оформление...
                  </>
                ) : (
                  <>
                    <Crown size={20} />
                    Оформить VIP
                  </>
                )}
              </button>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
