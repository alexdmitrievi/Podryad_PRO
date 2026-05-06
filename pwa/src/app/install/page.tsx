import Link from 'next/link';

type Step = {
  title: string;
  desc: string;
  chip?: {
    label: string;
    icon: React.ReactNode;
  };
};

type Platform = {
  id: 'ios' | 'android';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  steps: Step[];
};

const SHARE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const PLUS_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MENU_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const APPLE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#2F5BFF" aria-hidden="true">
    <path d="M17.05 12.04c-.03-2.83 2.31-4.18 2.42-4.25-1.32-1.93-3.37-2.2-4.1-2.23-1.74-.18-3.4 1.03-4.29 1.03-.88 0-2.25-1-3.7-.97-1.91.03-3.67 1.11-4.65 2.82-1.98 3.43-.51 8.51 1.42 11.3.94 1.36 2.06 2.89 3.52 2.84 1.41-.06 1.95-.92 3.66-.92 1.71 0 2.19.92 3.69.89 1.52-.03 2.49-1.39 3.42-2.76 1.08-1.59 1.52-3.13 1.55-3.21-.03-.01-2.97-1.14-3-4.54zM14.21 3.71c.78-.94 1.31-2.25 1.16-3.55-1.12.05-2.48.75-3.29 1.69-.72.83-1.36 2.16-1.19 3.43 1.25.1 2.53-.63 3.32-1.57z" />
  </svg>
);

const ANDROID_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#2F5BFF" aria-hidden="true">
    <path d="M16.61 15.15a.96.96 0 11.96-.96.96.96 0 01-.96.96m-9.22 0a.96.96 0 11.96-.96.96.96 0 01-.96.96m9.56-5.02l1.92-3.32a.4.4 0 00-.69-.4l-1.94 3.36a11.94 11.94 0 00-9.48 0L4.82 6.41a.4.4 0 10-.69.4l1.92 3.32A11.27 11.27 0 000 18.97h24a11.27 11.27 0 00-6.05-8.84" />
  </svg>
);

const PLATFORMS: Platform[] = [
  {
    id: 'ios',
    title: 'iPhone / iPad',
    subtitle: 'Safari',
    icon: APPLE_ICON,
    steps: [
      {
        title: 'Нажмите «Поделиться»',
        desc: 'Квадратная кнопка со стрелкой вверх в нижней панели Safari',
        chip: { label: 'Поделиться', icon: SHARE_ICON },
      },
      {
        title: 'Выберите «На экран «Домой»»',
        desc: 'Приложение появится на домашнем экране телефона',
        chip: { label: 'На экран «Домой»', icon: PLUS_ICON },
      },
      {
        title: 'Заходите по иконке',
        desc: 'Приложение откроется как обычное, без строки браузера',
      },
    ],
  },
  {
    id: 'android',
    title: 'Android',
    subtitle: 'Chrome / Яндекс',
    icon: ANDROID_ICON,
    steps: [
      {
        title: 'Нажмите «⋮» Меню',
        desc: 'Три точки в правом верхнем углу окна браузера',
        chip: { label: 'Меню', icon: MENU_ICON },
      },
      {
        title: 'Выберите «Установить приложение»',
        desc: 'Или пункт «Добавить на главный экран»',
        chip: { label: 'Установить приложение', icon: PLUS_ICON },
      },
      {
        title: 'Заходите по иконке',
        desc: 'Без запуска браузера, как обычное приложение',
      },
    ],
  },
];

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
            href="/#install"
            className="btn-shine bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:shadow-glow cursor-pointer"
          >
            На главную
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <header className="mb-10">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1a1a2e] dark:text-white mb-3 tracking-tight leading-tight">
            Установите приложение на главный экран
          </h1>
          <p className="text-gray-500 dark:text-dark-muted text-sm sm:text-base max-w-lg leading-relaxed">
            Добавьте иконку Подряд PRO на домашний экран телефона и заходите в&nbsp;один клик&nbsp;— без запуска браузера.
          </p>
        </header>

        <div className="space-y-6">
          {PLATFORMS.map((platform) => (
            <section
              key={platform.id}
              aria-labelledby={`platform-${platform.id}`}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-card border border-gray-100 dark:border-dark-border p-6 sm:p-7"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100 dark:border-dark-border">
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  {platform.icon}
                </div>
                <div className="min-w-0">
                  <p
                    id={`platform-${platform.id}`}
                    className="text-base font-bold text-[#1a1a2e] dark:text-white font-heading leading-tight"
                  >
                    {platform.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
                    {platform.subtitle}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <ol className="space-y-5">
                {platform.steps.map((step, idx) => {
                  const isFinal = idx === platform.steps.length - 1;
                  return (
                    <li key={idx} className="flex items-start gap-4">
                      <span
                        className={[
                          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold font-heading',
                          isFinal
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {isFinal ? '✓' : idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-[#1a1a2e] dark:text-white mb-1 leading-snug">
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-muted leading-relaxed">
                          {step.desc}
                        </p>
                        {step.chip && (
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-lg text-[11px] font-medium text-gray-500 dark:text-dark-muted">
                            {step.chip.icon}
                            <span>{step.chip.label}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-10 max-w-md mx-auto leading-relaxed">
          Это не установка из магазина&nbsp;&mdash; браузер просто добавляет ярлык сайта на&nbsp;домашний экран.
          Безопасно, без разрешений, занимает минимум места.
        </p>

        {/* Bottom back link — second exit point */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/#install"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M16 10H4m0 0l4-4m-4 4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Вернуться на главную</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
