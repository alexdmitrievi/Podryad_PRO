'use client';

import { useCallback, useEffect, useState } from 'react';
import PushPrompt from '@/components/PushPrompt';
import TelegramLink from '@/components/TelegramLink';

export type NotificationPushRole = 'customer' | 'worker';

export interface NotificationSettingsProps {
  pushRole: NotificationPushRole;
  phone?: string;
  telegramLinked?: boolean;
  onUnlinkTelegram?: () => void;
  className?: string;
}

export async function checkPushConfiguredClient(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem('podryad_push_enabled') === '1') return true;
  } catch {
    /* ignore */
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export default function NotificationSettings({
  pushRole,
  phone,
  telegramLinked = false,
  onUnlinkTelegram,
  className = '',
}: NotificationSettingsProps) {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPerm('unsupported');
      setPushOn(false);
      return;
    }
    setPerm(Notification.permission);
    const ok = await checkPushConfiguredClient();
    setPushOn(ok);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = (await res.json()) as { authenticated?: boolean };
        if (cancelled) return;
        setAuth(!!data.authenticated);
        if (data.authenticated) await refresh();
      } catch {
        if (!cancelled) setAuth(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const onEnabled = () => {
      refresh();
    };
    window.addEventListener('podryad-push-enabled', onEnabled);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('podryad-push-enabled', onEnabled);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const scrollToPush = () => {
    document.getElementById('push-setup')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTg = () => {
    document
      .getElementById('telegram-link')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const reopenPushSetup = () => {
    try {
      localStorage.removeItem('podryad_push_prompt_dismissed');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  const handleToggle = () => {
    if (pushOn) {
      // Already enabled — nothing to toggle off from JS; user must revoke in browser settings
      return;
    }
    try {
      if (localStorage.getItem('podryad_push_prompt_dismissed')) {
        reopenPushSetup();
        return;
      }
    } catch {
      /* ignore */
    }
    scrollToPush();
  };

  if (auth === false || auth === null) {
    return null;
  }

  const isEnabled = pushOn && perm === 'granted';

  return (
    <section className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-1">📬 Уведомления</h2>

      <div className="rounded-3xl bg-white dark:bg-dark-card p-4 shadow-card border border-gray-100 dark:border-dark-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-gray-700 dark:text-gray-200">🔔 Push-уведомления</span>
          <span className="text-right">
            {perm === 'unsupported' ? (
              <span className="text-gray-400 dark:text-gray-500">Не поддерживаются</span>
            ) : perm === 'denied' ? (
              <span className="text-gray-400 dark:text-gray-500">Заблокированы в браузере</span>
            ) : (
              <button
                role="switch"
                aria-checked={isEnabled}
                onClick={handleToggle}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                  isEnabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-dark-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </span>
        </div>

        <div className="border-t border-gray-100 dark:border-dark-border pt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-gray-700 dark:text-gray-200">📱 Telegram</span>
          <span className="text-right">
            {telegramLinked ? (
              <span className="font-medium text-emerald-700 dark:text-emerald-400">Привязан ✅</span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                Не привязан —{' '}
                <button
                  type="button"
                  onClick={scrollToTg}
                  className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                >
                  Привязать
                </button>
              </span>
            )}
          </span>
        </div>
      </div>

      <div id="push-setup">
        <PushPrompt role={pushRole} phone={phone} />
      </div>

      <div id="telegram-link">
        <TelegramLink
          linked={telegramLinked}
          onUnlink={onUnlinkTelegram}
        />
      </div>
    </section>
  );
}

export function AuthenticatedPushPrompt({
  role,
  phone,
  className = '',
}: {
  role: NotificationPushRole;
  phone?: string;
  className?: string;
}) {
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        if (!cancelled) setAuth(!!d.authenticated);
      })
      .catch(() => {
        if (!cancelled) setAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!auth) return null;

  return (
    <div className={className}>
      <PushPrompt role={role} phone={phone} />
    </div>
  );
}
