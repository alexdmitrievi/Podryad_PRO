'use client';

import { useCallback, useEffect, useState } from 'react';
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
      <div className={`px-1 ${className}`}>
        <p className="text-xs text-gray-400 leading-relaxed">
          Уведомления заблокированы в настройках браузера
        </p>
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div
        className={`rounded-3xl bg-white p-5 shadow-card border border-emerald-100 ${className}`}
      >
        <p className="text-sm font-semibold text-emerald-700">
          ✅ Уведомления включены!
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl bg-white p-5 shadow-card border border-gray-100 ${className}`}
    >
      <h3 className="text-base font-bold text-gray-900 mb-3">
        🔔 Включите уведомления
      </h3>

      <p className="text-sm text-gray-600 mb-3">Мы сообщим когда:</p>
      <ul className="text-sm text-gray-700 space-y-2 mb-5 list-none pl-0">
        <li className="flex gap-2">
          <span className="text-gray-400">•</span>
          <span>Исполнитель откликнулся на ваш заказ</span>
        </li>
        <li className="flex gap-2">
          <span className="text-gray-400">•</span>
          <span>Заказчик оценил вашу работу</span>
        </li>
        <li className="flex gap-2">
          <span className="text-gray-400">•</span>
          <span>Появился новый заказ в вашей категории</span>
        </li>
        <li className="flex gap-2">
          <span className="text-gray-400">•</span>
          <span>Выплата поступила на карту</span>
        </li>
      </ul>

      {error ? (
        <p className="text-sm text-red-600 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={onEnable}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-[0.98] shadow-sm shadow-brand-500/20 disabled:opacity-60"
      >
        {busy ? '…' : '🔔 Включить уведомления'}
      </button>

      <button
        type="button"
        onClick={onLater}
        className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-700"
      >
        Позже
      </button>
    </div>
  );
}
