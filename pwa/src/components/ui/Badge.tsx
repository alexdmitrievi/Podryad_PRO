type BadgeVariant = 'pending' | 'priced' | 'payment_sent' | 'paid' | 'in_progress' | 'confirming' | 'completed' | 'disputed' | 'cancelled' | 'vip';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const STYLES: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  pending:      { bg: 'bg-amber-50 dark:bg-amber-900/20',       text: 'text-amber-700 dark:text-amber-400',       dot: 'bg-amber-400' },
  priced:       { bg: 'bg-brand-50 dark:bg-brand-900/20',       text: 'text-brand-700 dark:text-brand-300',       dot: 'bg-brand-500' },
  payment_sent: { bg: 'bg-amber-50 dark:bg-amber-900/20',       text: 'text-amber-700 dark:text-amber-400',       dot: 'bg-amber-500' },
  paid:         { bg: 'bg-blue-50 dark:bg-blue-900/20',         text: 'text-blue-700 dark:text-blue-400',         dot: 'bg-blue-400' },
  in_progress:  { bg: 'bg-blue-50 dark:bg-blue-900/20',         text: 'text-blue-700 dark:text-blue-400',         dot: 'bg-blue-500' },
  confirming:   { bg: 'bg-violet-50 dark:bg-violet-900/20',     text: 'text-violet-700 dark:text-violet-400',     dot: 'bg-violet-500' },
  completed:    { bg: 'bg-emerald-50 dark:bg-emerald-900/20',   text: 'text-emerald-700 dark:text-emerald-400',   dot: 'bg-emerald-500' },
  disputed:     { bg: 'bg-red-50 dark:bg-red-900/20',           text: 'text-red-700 dark:text-red-400',           dot: 'bg-red-500' },
  cancelled:    { bg: 'bg-gray-100 dark:bg-gray-800/30',        text: 'text-gray-500 dark:text-gray-400',         dot: 'bg-gray-400' },
  vip:          { bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
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
