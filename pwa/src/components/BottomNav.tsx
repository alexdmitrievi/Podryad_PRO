'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: 'Главная' },
  { href: '/dashboard', icon: '📋', label: 'Заказы' },
  { href: '/app/order', icon: '➕', label: 'Заказ' },
  { href: '/app/profile', icon: '👤', label: 'Профиль' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass border-t border-gray-200/60 safe-area-pb">
      <div className="flex justify-around items-center py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl
                transition-all duration-200
                ${active
                  ? 'text-brand-500'
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'}
              `}
            >
              {active && (
                <span className="absolute inset-0 bg-brand-50 rounded-2xl animate-scale-in" />
              )}
              <span className="relative z-10 text-xl leading-none transition-all duration-200">
                {item.icon}
              </span>
              <span className={`
                relative z-10 text-[10px] leading-tight transition-all duration-200
                ${active ? 'font-bold' : 'font-medium'}
              `}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
