export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-white dark:bg-dark-bg">
      <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-7.07 7.07a5 5 0 000-7.07m-2.829 2.829a9 9 0 000 12.728" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Нет подключения к интернету
      </h1>
      <p className="max-w-sm text-gray-600 dark:text-gray-400">
        Проверьте соединение и попробуйте снова. Когда интернет появится, страница обновится автоматически.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
      >
        Попробовать снова
      </button>
    </div>
  );
}
