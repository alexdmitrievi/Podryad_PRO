'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * BackButton — унифицированная кнопка «Назад» для всех страниц.
 * Использует router.back() чтобы вернуть пользователя к позиции карточки
 * на лендинге (browser history сохраняет scroll position).
 *
 * Мировые стандарты UI/UX:
 * - 44px min tap target (WCAG 2.5.5)
 * - Focus-visible ring для клавиатурной навигации
 * - Анимированный hover/active с пружинным эффектом
 * - Glassmorphism на декстопе, компактный pill на мобилке
 * - aria-label для screen readers
 */

export default function BackButton({
  className = '',
  fallbackHref = '/',
  label = 'Назад',
}: {
  className?: string;
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Проверяем, можно ли вернуться назад в истории браузера
    setCanGoBack(window.history.length > 1 && document.referrer !== '');
  }, []);

  const handleClick = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`
        group
        inline-flex items-center gap-2
        px-4 py-2.5 min-h-[44px] min-w-[44px]
        text-sm font-semibold
        rounded-xl
        bg-white/80 dark:bg-dark-card/80
        backdrop-blur-lg
        border border-gray-200/60 dark:border-dark-border/60
        shadow-sm
        text-gray-700 dark:text-dark-text
        hover:bg-white dark:hover:bg-dark-card
        hover:border-brand-500/30 dark:hover:border-brand-500/30
        hover:text-brand-600 dark:hover:text-brand-400
        hover:shadow-md
        active:scale-[0.97]
        transition-all duration-200 ease-out
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-bg
        cursor-pointer select-none
        ${className}
      `}
    >
      {/* Arrow icon — slides left on hover */}
      <svg
        width="16" height="16" viewBox="0 0 20 20" fill="none"
        aria-hidden="true"
        className="shrink-0 transition-transform duration-300 ease-out group-hover:-translate-x-0.5"
      >
        <path
          d="M16 10H4m0 0l4-4m-4 4l4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
