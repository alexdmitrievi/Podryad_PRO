import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white shadow-sm shadow-brand-500/20 hover:bg-brand-600 dark:hover:bg-brand-400',
  secondary:
    'bg-white dark:bg-dark-card text-gray-800 dark:text-dark-text border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border',
  ghost:
    'bg-transparent text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border',
  danger:
    'bg-red-500 text-white shadow-sm shadow-red-500/20 hover:bg-red-600',
};

const SIZES: Record<Size, string> = {
  sm: 'py-2 px-4 text-xs gap-1.5',
  md: 'py-3 px-5 text-sm gap-2',
  lg: 'py-4 px-6 text-base gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold cursor-pointer
        rounded-button active:scale-[0.98] transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `.trim()}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" />}
      {children}
    </button>
  );
}
