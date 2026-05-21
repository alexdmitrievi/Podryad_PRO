import Link from 'next/link';
import Image from 'next/image';

export default function BusinessHelpPage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a]">
      {/* Navbar — unified logo pattern */}
      <nav className="sticky top-0 z-40 bg-[#0d0d1a]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/#services" className="flex items-center gap-2.5 group" aria-label="Подряд PRO — на главную">
            <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-xl opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-[16px] font-extrabold text-white font-heading tracking-tight">
              Подряд <span className="text-brand-400">PRO</span>
            </span>
          </Link>
          <Link
            href="/#lead-form"
            className="btn-shine bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all hover:shadow-glow cursor-pointer"
          >
            Оставить заявку
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #2F5BFF 100%)', boxShadow: '0 8px 32px rgba(108,92,231,0.4)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 8h2m2 0h2m2 0h2"/>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading mb-2 tracking-tight">Помощь бизнесу</h1>
          <p className="text-white/45 text-sm">Выберите способ связи — покажем, как сократить издержки</p>
        </div>

        {/* USP cards — same style as «Выгодно от Подряд PRO» */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🤖', title: 'ИИ-сотрудники', desc: 'Замена штатных единиц, кратно дешевле' },
            { icon: '📊', title: 'Маркетинг', desc: 'Дешёвые лиды и заказы в B2B и B2C' },
            { icon: '⚡', title: 'Автоматизация', desc: 'Рутина уходит — вы занимаетесь развитием' },
          ].map((item) => (
            <div key={item.title}
              className="group relative overflow-hidden rounded-2xl p-5 card-lift cursor-default flex flex-col text-white"
              style={{ background: 'linear-gradient(135deg, #1E2A5A 0%, #2d1b69 100%)' }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 blur-[40px] pointer-events-none" />
              <div className="relative z-[1] text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-sm mb-1 leading-tight">{item.title}</h3>
                <p className="text-white/55 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact options */}
        <div className="space-y-3">
          {/* MAX */}
          <a
            href="tel:+79620546601"
            className="group flex items-center gap-4 bg-white/[0.05] border border-white/[0.09] hover:border-[#2787F5]/50 hover:bg-[#2787F5]/10 rounded-2xl px-5 py-4 transition-all duration-200 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-[#2787F5]/20 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="7" fill="#2787F5"/>
                <path d="M12 6.5C8.963 6.5 6.5 8.963 6.5 12S8.963 17.5 12 17.5 17.5 15.037 17.5 12 15.037 6.5 12 6.5zm0 2c1.53 0 2.9.672 3.84 1.74l-7.08 2.99A3.476 3.476 0 018.5 12c0-1.933 1.567-3.5 3.5-3.5zm0 7c-1.53 0-2.9-.672-3.84-1.74l7.08-2.99c.165.39.26.816.26 1.23 0 1.933-1.567 3.5-3.5 3.5z" fill="white"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">MAX</div>
              <div className="text-white/40 text-xs mt-0.5">+7 (962) 054-66-01</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-white/25 group-hover:text-[#2787F5] group-hover:translate-x-0.5 transition-all flex-shrink-0">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Telegram */}
          <a
            href="https://t.me/zhbankov_alex"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 bg-white/[0.05] border border-white/[0.09] hover:border-[#2AABEE]/50 hover:bg-[#2AABEE]/10 rounded-2xl px-5 py-4 transition-all duration-200 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-[#2AABEE]/20 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="7" fill="#2AABEE"/>
                <path d="M17.5 6.5l-11 4.3 3.8 1.2 1.4 4.5 2.2-2.2 3.2 2.4 0.4-10.2z" fill="white"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">Telegram</div>
              <div className="text-white/40 text-xs mt-0.5">@zhbankov_alex</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-white/25 group-hover:text-[#2AABEE] group-hover:translate-x-0.5 transition-all flex-shrink-0">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Phone */}
          <a
            href="tel:+79620546601"
            className="group flex items-center gap-4 bg-white/[0.05] border border-white/[0.09] hover:border-green-500/50 hover:bg-green-500/10 rounded-2xl px-5 py-4 transition-all duration-200 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.9 10.82a19.79 19.79 0 01-3.07-8.63A2 2 0 012.82 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l.98-.98a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">Позвонить</div>
              <div className="text-white/40 text-xs mt-0.5">+7 (962) 054-66-01</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-white/25 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all flex-shrink-0">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Email */}
          <a
            href="mailto:ipzhbankov@yandex.ru"
            className="group flex items-center gap-4 bg-white/[0.05] border border-white/[0.09] hover:border-orange-500/50 hover:bg-orange-500/10 rounded-2xl px-5 py-4 transition-all duration-200 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">Email</div>
              <div className="text-white/40 text-xs mt-0.5 truncate">ipzhbankov@yandex.ru</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-white/25 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all flex-shrink-0">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        <p className="text-white/20 text-xs text-center mt-8 leading-relaxed">
          Консультация бесплатна&nbsp;&middot;&nbsp;Сократим издержки — вы займётесь развитием
        </p>

        <div className="text-center mt-6">
          <Link
            href="/#services"
            className="inline-flex items-center gap-1 text-white/40 hover:text-white/80 text-sm transition-colors"
          >
            ← На главную
          </Link>
        </div>
      </main>
    </div>
  );
}
