type BadgeVariant = 'pending' | 'published' | 'paid' | 'closed' | 'done' | 'cancelled' | 'vip';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const STYLES: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  pending:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-400' },
  paid:      { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-400' },
  published: { bg: 'bg-brand-50 dark:bg-brand-900/20',   text: 'text-brand-700 dark:text-brand-300',     dot: 'bg-brand-500' },
  closed:    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  done:      { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-600' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500' },
  vip:       { bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  const s = STYLES[variant] || STYLES.pending;
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1
        text-xs font-semibold ${s.bg} ${s.text} ${className}
      `.trim()}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {children}
    </span>
  );
}
