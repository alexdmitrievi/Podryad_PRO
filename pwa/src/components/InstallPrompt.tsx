'use client';

import { useEffect, useState } from 'react';
import { X, Plus, MonitorSmartphone } from 'lucide-react';

const STORAGE_KEY = 'podryad_install_prompt_dismissed';
const DISMISS_DAYS = 30;
const SHOW_DELAY_MS = 3000;
const SHOW_SCROLL_PX = 300;

function getPlatform(): { isIOS: boolean; isAndroid: boolean } {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false };
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid };
}

/** Show banner after 3s delay OR after scrolling 300px — whichever comes first.
 *  Respects: standalone mode, dismissal cookie (30 days). */
export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<{ isIOS: boolean; isAndroid: boolean }>({ isIOS: false, isAndroid: false });

  useEffect(() => {
    // Already in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const { isIOS, isAndroid } = getPlatform();
    if (!isIOS && !isAndroid) return;

    // Check dismissal
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const ts = Number(dismissed);
        if (!Number.isNaN(ts) && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch { /* ignore */ }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform({ isIOS, isAndroid });

    const onScroll = () => { if (window.scrollY >= SHOW_SCROLL_PX) setVisible(true); };
    window.addEventListener('scroll', onScroll, { passive: true });

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="animate-slide-in-bottom sticky top-0 z-[60] w-full">
      <div className="bg-gradient-to-r from-brand-500 via-brand-600 to-violet text-white shadow-glow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <MonitorSmartphone className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-heading font-bold mb-1">
              Установите приложение на главный экран
            </p>

            {platform.isIOS ? (
              <p className="text-xs text-white/80 leading-relaxed">
                Нажмите{' '}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/20 rounded-md font-medium text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Поделиться
                </span>
                {' '}в Safari и выберите{' '}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/20 rounded-md font-medium text-white">
                  <Plus className="h-3 w-3" />
                  На экран &laquo;Домой&raquo;
                </span>
              </p>
            ) : (
              <p className="text-xs text-white/80 leading-relaxed">
                Нажмите{' '}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/20 rounded-md font-medium text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                  Меню
                </span>
                {' '}в браузере и выберите{' '}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/20 rounded-md font-medium text-white">
                  <Plus className="h-3 w-3" />
                  Установить приложение
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 -mr-1 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
