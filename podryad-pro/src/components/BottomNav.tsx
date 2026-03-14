'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/app/map', label: 'Карта', icon: '🗺' },
  { href: '/app/order', label: 'Заказ', icon: '➕' },
  { href: '/app/profile', label: 'Профиль', icon: '👤' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-t border-gray-200 flex justify-around py-3 shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center transition-colors ${
              active ? 'text-brand-blue' : 'text-gray-400 hover:text-brand-blue'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
