'use client';

import { useState, useEffect, useCallback } from 'react';

const LOCAL_KEY = 'sw_recovery_last';
const COOLDOWN_MS = 30_000;
const ERROR_THRESHOLD = 2;

let globalErrorCount = 0;
let globalLastErrorTime = 0;

function isChunkLoadError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('loading chunk') ||
    lower.includes('loading css chunk') ||
    lower.includes('chunkloaderror') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('failed to fetch') ||
    lower.includes('importing a module script failed') ||
    lower.includes('networkerror when attempting to fetch resource')
  );
}

export default function SWRecovery() {
  const [visible, setVisible] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const handleRecover = useCallback(async () => {
    setRecovering(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      localStorage.setItem(LOCAL_KEY, String(Date.now()));
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    const lastRecovery = Number(localStorage.getItem(LOCAL_KEY) || '0');
    if (Date.now() - lastRecovery < COOLDOWN_MS) return;

    const onError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (isChunkLoadError(msg)) {
        globalErrorCount++;
        globalLastErrorTime = Date.now();
        if (globalErrorCount >= ERROR_THRESHOLD) {
          setVisible(true);
        }
      }
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        typeof reason === 'string'
          ? reason
          : reason instanceof Error
            ? reason.message
            : String(reason ?? '');
      if (isChunkLoadError(msg)) {
        globalErrorCount++;
        globalLastErrorTime = Date.now();
        if (globalErrorCount >= ERROR_THRESHOLD) {
          setVisible(true);
        }
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);

    const interval = setInterval(() => {
      if (globalErrorCount > 0 && Date.now() - globalLastErrorTime > 10_000) {
        globalErrorCount = 0;
      }
    }, 5000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in border border-gray-100 dark:border-dark-border">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-[#1a1a2e] dark:text-white mb-2 font-heading">
          Устаревшая версия приложения
        </h3>
        <p className="text-sm text-gray-500 dark:text-dark-muted mb-6 leading-relaxed">
          Приложение было обновлено, но ваш браузер загрузил старую версию.
          Очистите кеш для загрузки актуальной версии.
        </p>

        <button
          type="button"
          onClick={handleRecover}
          disabled={recovering}
          className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 text-sm transition-all hover:shadow-glow disabled:opacity-50 cursor-pointer"
        >
          {recovering ? (
            <span className="inline-flex items-center gap-2">
              <span className="btn-spinner" />
              Очистка...
            </span>
          ) : (
            'Очистить кеш и перезагрузить'
          )}
        </button>

        <button
          type="button"
          onClick={() => setVisible(false)}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
