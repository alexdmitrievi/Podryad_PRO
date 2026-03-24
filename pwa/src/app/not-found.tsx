import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-7xl font-extrabold text-gray-200 dark:text-dark-border">404</h1>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Страница не найдена
      </h2>
      <p className="text-sm text-gray-500 dark:text-dark-muted max-w-sm">
        Страница, которую вы ищете, не существует или была перемещена.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
      >
        На главную
      </Link>
    </div>
  );
}
