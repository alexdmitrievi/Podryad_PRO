'use client';

import { ExternalLink } from 'lucide-react';

interface Props {
  action?: 'bot' | 'channel' | 'order' | 'vip' | 'pick';
  variant?: 'buttons' | 'inline' | 'compact';
  className?: string;
}

export default function MessengerLinks({
  action = 'bot',
  variant = 'buttons',
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

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <a
        href={telegram.url}
        target="_blank"
        rel="noopener noreferrer"
        className="
          group flex items-center justify-center gap-2 w-full
          bg-brand-500 text-white font-bold py-3.5 px-6
          rounded-2xl text-base hover:bg-brand-600
          active:scale-[0.97] transition-all duration-200
          shadow-sm
        "
      >
        📱 Открыть в Telegram
        <ExternalLink size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
      </a>
      <a
        href={max.url}
        target="_blank"
        rel="noopener noreferrer"
        className="
          group flex items-center justify-center gap-2 w-full
          bg-max text-white font-bold py-3.5 px-6
          rounded-2xl text-base hover:bg-max-dark
          active:scale-[0.97] transition-all duration-200
          shadow-sm
        "
      >
        💬 Открыть в MAX
        <ExternalLink size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
      </a>
      <p className="text-gray-400 text-xs text-center">
        MAX работает без VPN на территории РФ
      </p>
    </div>
  );
}
