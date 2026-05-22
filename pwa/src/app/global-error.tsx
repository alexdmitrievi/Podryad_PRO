'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#f7f9fc] dark:bg-[#0a0c14] flex items-center justify-center font-sans antialiased">
        <div className="flex flex-col items-center gap-6 px-6 py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-[#1a1a2e] dark:text-white mb-2">
              Что-то пошло не&nbsp;так
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Произошла критическая ошибка. Попробуйте перезагрузить страницу.
            </p>
            {error.digest ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-mono">
                Код ошибки: {error.digest}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Попробовать снова
            </button>
            <button
              type="button"
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
                }
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister());
                  });
                }
                window.location.reload();
              }}
              className="rounded-xl border border-gray-300 dark:border-gray-600 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Очистить кеш и перезагрузить
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
