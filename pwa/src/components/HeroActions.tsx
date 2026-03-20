'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import MessengerLinks from '@/components/MessengerLinks';

/** Одна геометрия: обводка 2px, без лишней тени */
const heroCta =
  'flex h-14 min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-2xl border-2 px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:text-base sm:px-4';

const heroSectionLabel =
  'mb-1.5 block text-center text-[11px] font-medium uppercase tracking-[0.14em] text-white/50';

export default function HeroActions() {
  const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

  return (
    <div className="mx-auto w-full max-w-sm space-y-5">
      <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-center text-sm leading-snug text-white/85 backdrop-blur-sm">
        💡 Telegram заблокирован? Используйте{' '}
        <a
          href={maxChannel}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white underline decoration-white/40 underline-offset-2 hover:text-white"
        >
          MAX
        </a>{' '}
        — работает без VPN
      </div>

      <div>
        <p className={heroSectionLabel}>Мессенджеры</p>
        <MessengerLinks action="bot" variant="buttons" hero />
      </div>

      <div>
        <p className={heroSectionLabel}>Аккаунт</p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/auth/register"
            title="Зарегистрироваться"
            className={`${heroCta} border-white bg-white text-brand-700 hover:bg-white/95`}
          >
            Регистрация
          </Link>
          <Link
            href="/auth/login"
            className={`${heroCta} border-white/45 bg-white/10 text-white backdrop-blur-sm hover:bg-white/18`}
          >
            Войти
          </Link>
        </div>
      </div>

      <div>
        <p className={heroSectionLabel}>Заказы</p>
        <Link
          href="/dashboard"
          className={`${heroCta} border-white/35 bg-white/10 text-white backdrop-blur-sm hover:bg-white/18`}
        >
          <MapPin size={18} className="shrink-0 opacity-90" aria-hidden />
          Смотреть заказы
        </Link>
      </div>
    </div>
  );
}
