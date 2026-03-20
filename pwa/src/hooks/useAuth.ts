'use client';

import { useEffect, useState } from 'react';

export type AuthRole = 'customer' | 'worker' | null;

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<AuthRole>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        if (me.status === 401) {
          if (!cancelled) {
            setUserId(null);
            setRole(null);
          }
          return;
        }

        const data = (await me.json()) as {
          authenticated?: boolean;
          telegram_id?: string;
          role?: AuthRole;
        };

        if (!data.authenticated || !data.telegram_id) {
          if (!cancelled) {
            setUserId(null);
            setRole(null);
          }
          return;
        }

        if (!cancelled) {
          setUserId(data.telegram_id);
          setRole(data.role ?? null);
        }
      } catch {
        if (!cancelled) {
          setUserId(null);
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, userId, role };
}
