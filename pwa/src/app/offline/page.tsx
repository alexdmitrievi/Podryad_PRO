'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const go = () => setIsOnline(true);
    window.addEventListener('online', go);
    return () => window.removeEventListener('online', go);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-white dark:bg-dark-bg">
      <Image src="/logo.png" alt="Подряд PRO" width={80} height={80} className="rounded-2xl" />

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white font-heading">
          {isOnline ? 'Соединение восстановлено' : 'Нет подключения'}
        </h1>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {isOnline
            ? 'Интернет снова доступен. Нажмите кнопку, чтобы продолжить.'
            : 'Проверьте соединение. Страница обновится автоматически, когда интернет появится.'}
        </p>
      </div>

      {isOnline ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            На главную
          </Link>
          <Link
            href="/order/new"
            className="rounded-2xl border border-brand-500 px-6 py-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            Создать заказ
          </Link>
        </div>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Попробовать снова
        </button>
      )}

      <div className="flex gap-6 mt-4">
        <Link href="/catalog/labor" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
          Рабочие
        </Link>
        <Link href="/equipment" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
          Техника
        </Link>
        <Link href="/catalog/materials" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
          Материалы
        </Link>
      </div>
    </div>
  );
}
