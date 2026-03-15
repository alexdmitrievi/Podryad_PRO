'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/app/map', icon: '🗺', label: 'Карта' },
  { href: '/app/order', icon: '➕', label: 'Заказ' },
  { href: '/app/profile', icon: '👤', label: 'Профиль' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-t border-gray-200 flex justify-around py-2.5 px-4
                    safe-area-pb">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors
              ${active ? 'text-[#0088cc]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
