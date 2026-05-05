import Link from 'next/link';

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg font-sans">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md border-b border-gray-100/80 dark:border-dark-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-[17px] font-extrabold text-brand-900 dark:text-white font-heading tracking-tight">
            Подряд <span className="text-brand-500">PRO</span>
          </span>
          <Link
            href="/"
            className="btn-shine bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:shadow-glow cursor-pointer"
          >
            На главную
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white mb-2 tracking-tight">
          Установите приложение на главный экран
        </h1>
        <p className="text-gray-500 dark:text-dark-muted text-sm mb-10 max-w-lg">
          Добавьте иконку Подряд PRO на домашний экран телефона и заходите в один клик — без запуска браузера.
        </p>

        <div className="space-y-6">
          {/* iOS */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card border border-gray-100 dark:border-dark-border p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F5BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.74-2.77 6.53A13.96 13.96 0 0112 22a13.96 13.96 0 01-4.23-6.47C6.19 13.74 5 11.38 5 9a7 7 0 017-7z"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-[#1a1a2e] dark:text-white font-heading">iPhone / iPad</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">Safari</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-extrabold font-heading">1</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-0.5">Нажмите &laquo;Поделиться&raquo;</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Квадратная кнопка со стрелкой вверх в нижней панели Safari</p>
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-lg text-[11px] font-medium text-gray-500 dark:text-dark-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                    <span>Поделиться</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-extrabold font-heading">2</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-0.5">Выберите &laquo;На экран &laquo;Домой&raquo;&raquo;</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Приложение появится на домашнем экране</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-lg text-[11px] font-medium text-gray-500 dark:text-dark-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>На экран &laquo;Домой&raquo;</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">✓</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-0.5">Заходите по иконке</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Приложение откроется как обычное, без строки браузера</p>
                </div>
              </div>
            </div>
          </div>

          {/* Android */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card border border-gray-100 dark:border-dark-border p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F5BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-[#1a1a2e] dark:text-white font-heading">Android</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">Chrome / Яндекс</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-extrabold font-heading">1</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-0.5">Нажмите &laquo;⋮&raquo; Меню</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Три точки в правом верхнем углу браузера</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-lg text-[11px] font-medium text-gray-500 dark:text-dark-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/>
                    </svg>
                    <span>Меню</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-extrabold font-heading">2</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-0.5">Выберите &laquo;Установить приложение&raquo;</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Или &laquo;Добавить на главный экран&raquo;</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-lg text-[11px] font-medium text-gray-500 dark:text-dark-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Установить приложение</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">✓</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-0.5">Заходите по иконке</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Без запуска браузера, как обычное приложение</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-10 max-w-md mx-auto leading-relaxed">
          Это не установка из магазина&nbsp;&mdash; браузер просто добавляет ярлык сайта на&nbsp;домашний экран.
          Безопасно, без разрешений, занимает минимум места.
        </p>
      </main>

    </div>
  );
}
