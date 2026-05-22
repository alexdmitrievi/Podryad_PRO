'use client';

import { useEffect } from 'react';

/** В development снимает регистрацию SW, чтобы не отдавались устаревшие чанки после HMR. */
export default function DevUnregisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister();
    });
  }, []);
  return null;
}
