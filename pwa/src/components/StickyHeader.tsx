'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function StickyHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { loading, userId } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/auth')) return null;

  const loggedIn = Boolean(userId) && !loading;

  return (
    <header
      className={`
        hidden md:block fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
        }
      `}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Подряд PRO" width={32} height={32} className="rounded-lg" />
          <span
            className={`text-lg font-extrabold transition-colors duration-300 ${
              scrolled ? 'text-gray-900' : 'text-white'
            }`}
          >
            Подряд PRO
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {[
            { href: '/app/map', label: 'Заказы' },
            { href: '/equipment', label: 'Аренда' },
            { href: '/app/payments', label: 'Тарифы' },
            { href: '/selfemployed', label: 'Самозанятым' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300
                ${pathname === item.href
                  ? scrolled
                    ? 'bg-[#0088cc]/10 text-[#0088cc]'
                    : 'bg-white/20 text-white'
                  : scrolled
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors duration-300 ${
                  scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'
                }`}
              >
                📋 Мои заказы
              </Link>
              <Link
                href="/app/profile"
                className={`
                  text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300
                  ${scrolled
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }
                `}
              >
                👤 Профиль
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`
                  text-sm font-medium transition-colors duration-300
                  ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}
                `}
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className={`
                  text-sm font-bold px-5 py-2 rounded-xl transition-all duration-300
                  ${scrolled
                    ? 'bg-[#0088cc] text-white hover:bg-[#0077b3] shadow-sm'
                    : 'bg-white text-[#0088cc] hover:bg-white/90 shadow-sm'
                  }
                `}
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
