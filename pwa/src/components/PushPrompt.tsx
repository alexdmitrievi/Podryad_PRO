'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';
import {
  getPushPermissionStatus,
  subscribeToPush,
} from '@/lib/push-client';

const STORAGE_DISMISS = 'podryad_push_prompt_dismissed';
const STORAGE_DONE = 'podryad_push_enabled';

export type PushPromptRole = 'customer' | 'worker';

export interface PushPromptProps {
  /** Роль для POST /api/push/subscribe */
  role: PushPromptRole;
  /** Телефон, если нет в таблице Workers (например заказчик) */
  phone?: string;
  className?: string;
}

type ViewState =
  | 'loading'
  | 'hidden'
  | 'prompt'
  | 'denied'
  | 'success'
  | 'dismissed';

export default function PushPrompt({
  role,
  phone,
  className = '',
}: PushPromptProps) {
  const [view, setView] = useState<ViewState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data: { authenticated?: boolean } = await res.json();
        if (cancelled) return;

        if (!data.authenticated) {
          setView('hidden');
          return;
        }

        const perm = getPushPermissionStatus();
        if (perm === 'unsupported') {
          setView('hidden');
          return;
        }
        if (perm === 'denied') {
          setView('denied');
          return;
        }
        if (perm === 'granted') {
          setView('hidden');
          return;
        }

        try {
          if (
            typeof window !== 'undefined' &&
            localStorage.getItem(STORAGE_DISMISS) === '1'
          ) {
            setView('dismissed');
            return;
          }
          if (
            typeof window !== 'undefined' &&
            localStorage.getItem(STORAGE_DONE) === '1'
          ) {
            setView('hidden');
            return;
          }
        } catch {
          /* ignore */
        }

        setView('prompt');
      } catch {
        if (!cancelled) setView('hidden');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onEnable = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        setError(
          'Не удалось включить уведомления. Разрешите их в запросе браузера или попробуйте позже.'
        );
        return;
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          role,
          ...(phone?.trim() ? { phone: phone.trim() } : {}),
        }),
      });

      if (!res.ok) {
        let msg = 'Не удалось сохранить подписку на сервере.';
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }

      try {
        localStorage.setItem(STORAGE_DONE, '1');
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('podryad-push-enabled'));
      }
      setView('success');
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Не удалось включить уведомления. Попробуйте позже.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [role, phone]);

  const onLater = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_DISMISS, '1');
    } catch {
      /* ignore */
    }
    setView('dismissed');
  }, []);

  if (view === 'loading' || view === 'hidden' || view === 'dismissed') {
    return null;
  }

  if (view === 'denied') {
    return (
      <div
        className={`flex items-center gap-3 p-4 rounded-card bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 ${className}`}
      >
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Уведомления заблокированы в настройках браузера
        </p>
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div
        className={`flex items-center gap-3 p-4 rounded-card bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 ${className}`}
      >
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Уведомления включены
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-3 p-4 rounded-card bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
        <Bell className="h-5 w-5 flex-shrink-0 text-brand-500" />
        <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">
          Включите уведомления, чтобы не пропустить заказы
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onEnable}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand-500 text-white transition-colors hover:bg-brand-600 active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? '...' : 'Включить'}
        </button>
        <button
          type="button"
          onClick={onLater}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400 px-1" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
