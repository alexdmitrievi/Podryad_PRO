'use client';

import { useEffect } from 'react';

/** Временно: принудительно удаляет старый Service Worker (баг с кешированием на iOS). */
export default function DevUnregisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister();
    });
  }, []);
  return null;
}
