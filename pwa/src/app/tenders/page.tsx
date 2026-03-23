'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchStats, fetchTenders, type TenderListResponse } from '@/lib/tenders-api';

export default function TendersPage() {
  const [q, setQ] = useState('');
  const [niche, setNiche] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TenderListResponse | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (niche) p.set('niche', niche);
    if (region) p.set('region', region);
    p.set('page', String(page));
    p.set('page_size', '20');
    const list = await fetchTenders(p);
    if (!list && process.env.NEXT_PUBLIC_TENDER_API_URL) {
      setErr('Не удалось загрузить тендеры. Проверьте API.');
    }
    setData(list);
  }, [q, niche, region, page]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    void (async () => {
      const s = await fetchStats();
      setStats(s);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 dark:bg-dark-bg min-h-screen">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Тендеры</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Поиск по базе (нужен{' '}
        <code className="rounded bg-zinc-100 dark:bg-dark-card px-1">NEXT_PUBLIC_TENDER_API_URL</code> на FastAPI).
      </p>

      {stats && (
        <section className="mt-6 grid gap-2 rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 text-sm dark:text-gray-200">
          <div>Всего в выборке: {String((stats as { total?: number }).total ?? '—')}</div>
        </section>
      )}

      <section className="mt-6 space-y-3 rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded border border-zinc-300 dark:border-dark-border bg-white dark:bg-dark-card dark:text-white px-3 py-2 text-sm"
            placeholder="Поиск по названию"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="rounded border border-zinc-300 dark:border-dark-border bg-white dark:bg-dark-card dark:text-white px-3 py-2 text-sm"
            placeholder="Ниша (furniture / construction)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
          <input
            className="rounded border border-zinc-300 dark:border-dark-border bg-white dark:bg-dark-card dark:text-white px-3 py-2 text-sm"
            placeholder="Регион"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded bg-zinc-900 dark:bg-brand-500 px-4 py-2 text-sm text-white"
          onClick={() => void load()}
        >
          Применить
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </section>

      <section className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-dark-bg dark:text-gray-200">
            <tr>
              <th className="px-3 py-2">Название</th>
              <th className="px-3 py-2">НМЦК</th>
              <th className="px-3 py-2">Дедлайн</th>
              <th className="px-3 py-2">Площадка</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((row) => (
              <tr key={String(row.id)} className="border-b border-zinc-100 dark:border-dark-border dark:text-gray-200">
                <td className="px-3 py-2">
                  <a
                    className="text-blue-700 underline"
                    href={String(row.external_url || '#')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {String(row.title || '')}
                  </a>
                </td>
                <td className="px-3 py-2">{row.nmck != null ? String(row.nmck) : '—'}</td>
                <td className="px-3 py-2">{String(row.submission_deadline || '—')}</td>
                <td className="px-3 py-2">{String(row.source_platform || '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-3 py-2 text-sm dark:text-gray-200">
          <button
            type="button"
            className="rounded border border-zinc-300 dark:border-dark-border dark:text-gray-200 px-3 py-1"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span>Стр. {page}</span>
          <button type="button" className="rounded border border-zinc-300 dark:border-dark-border dark:text-gray-200 px-3 py-1" onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-dashed border-zinc-300 dark:border-dark-border p-4 text-sm text-zinc-600 dark:text-gray-200">
        <p className="font-medium text-zinc-800 dark:text-white">Telegram Login (виджет)</p>
        <p className="mt-1">
          Подключите виджет авторизации на этой странице и свяжите{' '}
          <code className="rounded bg-zinc-100 dark:bg-dark-card px-1">telegram_user_id</code> с сессией PWA по аналогии с
          существующим auth.
        </p>
      </section>
    </main>
  );
}
