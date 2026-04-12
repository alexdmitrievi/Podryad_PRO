'use client';

import { useEffect } from 'react';
import Link from 'next/link';

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error instanceof Event) {
    return error.type
      ? `Сбой в браузере (событие «${error.type}»). Обновите страницу.`
      : 'Сбой в браузере. Обновите страницу.';
  }
  return 'Произошла ошибка. Обновите страницу или откройте сайт в новой вкладке.';
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App route error:', error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Что-то пошло не так</h2>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">{messageFromUnknown(error as unknown)}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Попробовать снова
      </button>
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        &larr; На главную
      </Link>
    </div>
  );
}
