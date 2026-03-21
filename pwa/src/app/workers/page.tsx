'use client';

import { useEffect, useState } from 'react';
import { Star, Briefcase, Crown, Loader2, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface TopWorker {
  name: string;
  rating: number;
  jobs_count: number;
  is_vip: boolean;
  skills: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<TopWorker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <PageHeader title="👷 Исполнители" />

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="text-brand-500 animate-spin" />
            <span className="text-sm text-gray-400">Загрузка...</span>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-5xl mb-4">👥</p>
            <p className="font-bold text-lg text-gray-800">Пока нет исполнителей</p>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Зарегистрируйтесь через бот @{process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot'}
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-500 text-white font-medium py-2.5 px-6 rounded-xl
                           text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
              >
                📱 Открыть бот
              </a>
              <a
                href="/dashboard"
                className="bg-gray-100 text-gray-700 font-medium py-2.5 px-6 rounded-xl
                           text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                📋 Смотреть заказы
              </a>
            </div>
          </div>
        ) : (
          workers.map((w, i) => (
            <div
              key={i}
              className="
                bg-white rounded-3xl p-5 shadow-card border border-gray-100
                hover:shadow-card-hover transition-all duration-300
                flex items-center gap-4 animate-fade-in
              "
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Rank / Avatar */}
              <div className="relative">
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold
                  ${i < 3
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400'}
                `}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
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
                  <span className="font-bold text-gray-900 truncate">{w.name}</span>
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
          ))
        )}
      </main>
    </div>
  );
}
