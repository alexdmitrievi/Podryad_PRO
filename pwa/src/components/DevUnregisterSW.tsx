'use client';

import { useEffect } from 'react';

export default function DevUnregisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) {
        void r.unregister();
      }
    });
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith('workbox-') || key.includes('next-') || key === 'pages' || key === 'static-assets' || key === 'fallback') {
            void caches.delete(key);
          }
        }
      });
    }
  }, []);
  return null;
}
