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
    <header className="bg-[#0088cc] text-white px-4 py-3 flex-shrink-0">
      <div className="max-w-lg mx-auto">
        <Link
          href={backHref}
          className="text-sm text-white/80 hover:text-white transition-colors"
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
