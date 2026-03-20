'use client';

import { ExternalLink } from 'lucide-react';

interface Props {
  action?: 'bot' | 'channel' | 'order' | 'vip' | 'pick';
  variant?: 'buttons' | 'inline' | 'compact';
  /** Светлый текст подписи (для тёмного градиента hero) */
  hero?: boolean;
  className?: string;
}

const heroBtn =
  'group flex h-14 min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:text-base sm:px-4';

export default function MessengerLinks({
  action = 'bot',
  variant = 'buttons',
  hero = false,
  className = '',
}: Props) {
  const tgBot = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
  const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

  const links: Record<string, { telegram: { url: string; label: string }; max: { url: string; label: string } }> = {
    bot: {
      telegram: { url: `https://t.me/${tgBot}`, label: 'Telegram' },
      max: { url: maxChannel, label: 'MAX' },
    },
    channel: {
      telegram: { url: 'https://t.me/podryad_pro', label: 'Telegram' },
      max: { url: maxChannel, label: 'MAX' },
    },
    order: {
      telegram: { url: `https://t.me/${tgBot}?start=order`, label: 'Telegram' },
      max: { url: maxChannel, label: 'MAX' },
    },
    vip: {
      telegram: { url: `https://t.me/${tgBot}?start=vip`, label: 'Telegram' },
      max: { url: maxChannel, label: 'MAX' },
    },
    pick: {
      telegram: { url: `https://t.me/${tgBot}?start=pick`, label: 'Telegram' },
      max: { url: maxChannel, label: 'MAX' },
    },
  };

  const { telegram, max } = links[action];

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 text-sm ${className}`}>
        <a
          href={telegram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-500 hover:text-brand-700 font-medium transition-colors"
        >
          Telegram
        </a>
        <span className="text-gray-300">|</span>
        <a
          href={max.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-max hover:text-max-dark font-medium transition-colors"
        >
          MAX
        </a>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <a
          href={telegram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl
            bg-brand-50 text-brand-600 text-sm font-semibold
            hover:bg-brand-100 active:scale-[0.97]
            transition-all duration-200 border border-brand-100
          "
        >
          📱 {telegram.label}
        </a>
        <a
          href={max.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl
            bg-max-light text-max text-sm font-semibold
            hover:bg-max/10 active:scale-[0.97]
            transition-all duration-200 border border-max/20
          "
        >
          💬 {max.label}
        </a>
      </div>
    );
  }

  const captionClass = hero ? 'text-white/45' : 'text-gray-400';

  const tgClass = hero
    ? `${heroBtn} border border-white/15 bg-brand-600 text-white hover:bg-brand-500`
    : `${heroBtn} bg-brand-500 text-white shadow-sm hover:bg-brand-600`;
  const maxClass = hero
    ? `${heroBtn} border border-white/15 bg-brand-500 text-white hover:bg-brand-400`
    : `${heroBtn} bg-max text-white shadow-sm hover:bg-max-dark`;

  return (
    <div className={`grid w-full grid-cols-2 gap-2 ${className}`}>
      <a href={telegram.url} target="_blank" rel="noopener noreferrer" className={tgClass}>
        <span className="truncate font-semibold">Telegram</span>
        <ExternalLink size={16} className="shrink-0 opacity-80 group-hover:opacity-100" aria-hidden />
      </a>
      <a href={max.url} target="_blank" rel="noopener noreferrer" className={maxClass}>
        <span className="truncate font-semibold">MAX</span>
        <ExternalLink size={16} className="shrink-0 opacity-80 group-hover:opacity-100" aria-hidden />
      </a>
      <p className={`col-span-2 text-center text-[11px] leading-snug ${captionClass}`}>
        MAX работает без VPN на территории РФ
      </p>
    </div>
  );
}
