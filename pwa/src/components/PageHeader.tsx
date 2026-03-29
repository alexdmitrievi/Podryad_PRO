'use client';

import Link from 'next/link';

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backHref = '/',
  backLabel = '← Главная',
}: Props) {
  return (
    <header className="bg-gradient-to-r from-brand-900 to-brand-600 text-white px-4 py-3 flex-shrink-0">
      <div className="max-w-lg mx-auto">
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          {backLabel}
        </Link>
        <h1 className="text-lg font-bold mt-1">{title}</h1>
        {subtitle && (
          <p className="text-xs text-white/70">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
