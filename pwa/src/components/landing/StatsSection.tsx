import { ClipboardList, Users, UsersRound, Star } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';
import ScrollReveal from '@/components/ScrollReveal';

const stats = [
  {
    icon: ClipboardList,
    end: 500,
    suffix: '+',
    label: 'заказов выполнено',
    color: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-900/30',
  },
  {
    icon: Users,
    end: 200,
    suffix: '+',
    label: 'исполнителей',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: UsersRound,
    end: 47,
    suffix: '+',
    label: 'бригад',
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: Star,
    end: 4.8,
    decimals: 1,
    suffix: '',
    label: 'средний рейтинг',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    prefix: '⭐ ',
  },
];

export default function StatsSection() {
  return (
    <section className="bg-white dark:bg-dark-card py-16 md:py-20 border-t border-gray-100 dark:border-dark-border">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal delay={0}>
          <p className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-dark-muted mb-8">
            Подряд PRO в цифрах
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="text-center">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
                  <stat.icon size={22} className={stat.color} />
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} decimals={stat.decimals ?? 0} duration={1800} />
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-dark-muted mt-1.5 leading-tight">
                  {stat.label}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
