'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, PlusCircle, UserCircle, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/', icon: Home, label: 'Главная' },
  { href: '/dashboard', icon: ClipboardList, label: 'Заказы' },
  { href: '/catalog/workers', icon: Store, label: 'Каталог' },
  { href: '/order/new', icon: PlusCircle, label: 'Заказ' },
  { href: '/join', icon: UserCircle, label: 'Работа' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden glass dark:bg-dark-card/90 dark:backdrop-blur-xl border-t border-gray-200/60 dark:border-dark-border safe-area-pb">
      <div className="flex justify-around items-center py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`
                relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl
                transition-all duration-200
                ${active
                  ? 'text-brand-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:scale-95'}
              `}
            >
              {active && (
                <span className="absolute inset-0 bg-brand-50 dark:bg-brand-500/10 rounded-2xl animate-scale-in" />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className="relative z-10 transition-all duration-200"
              />
              <span className={`
                relative z-10 text-[10px] leading-tight transition-all duration-200
                ${active ? 'font-bold' : 'font-medium'}
              `}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-brand-500 animate-scale-in z-10" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
