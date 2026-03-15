'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0088cc] text-white px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-bold">👷 Исполнители</h1>
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">
            ← Главная
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">👥</p>
            <p className="font-medium text-lg">Пока нет исполнителей</p>
            <p className="text-sm mt-2">Зарегистрируйтесь через бот!</p>
          </div>
        ) : (
          workers.map((w, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
                {w.is_vip ? '🌟' : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 truncate">{w.name}</span>
                  {w.is_vip && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  ⭐ {w.rating.toFixed(1)} · {w.jobs_count} заказов
                </p>
                {w.skills && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{w.skills}</p>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
