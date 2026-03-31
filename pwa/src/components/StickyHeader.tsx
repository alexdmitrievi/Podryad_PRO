'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, ClipboardList, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { href: '/app/map', label: 'Заказы' },
  { href: '/equipment', label: 'Аренда' },
  { href: '/marketplace', label: 'Маркетплейс' },
  { href: '/app/payments', label: 'Тарифы' },
  { href: '/selfemployed', label: 'Самозанятым' },
];

export default function StickyHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { loading, userId } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/auth')) return null;

  const loggedIn = Boolean(userId) && !loading;

  return (
    <>
      <header
        className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:bg-dark-card/95 dark:border-dark-border'
          : 'bg-transparent'
        }
      `}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Подряд PRO"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span
              className={`text-base md:text-lg font-extrabold transition-colors duration-300 ${
                scrolled ? 'text-gray-900 dark:text-dark-text' : 'text-white'
              }`}
            >
              Подряд PRO
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300
                ${pathname === item.href
                  ? scrolled
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'bg-white/20 text-white'
                  : scrolled
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-dark-border'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {loggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-300 ${
                    scrolled ? 'text-gray-600 hover:text-gray-900 dark:text-dark-muted dark:hover:text-dark-text' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <ClipboardList size={15} className="shrink-0" />
                  Мои заказы
                </Link>
                <Link
                  href="/app/profile"
                  className={`
                  inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300
                  ${scrolled
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }
                `}
                >
                  <User size={15} className="shrink-0" />
                  Профиль
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`
                  text-sm font-medium transition-colors duration-300
                  ${scrolled ? 'text-gray-600 hover:text-gray-900 dark:text-dark-muted dark:hover:text-dark-text' : 'text-white/80 hover:text-white'}
                `}
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className={`
                  text-sm font-bold px-5 py-2 rounded-xl transition-all duration-300
                  ${scrolled
                    ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
                    : 'bg-white text-brand-500 hover:bg-white/90 shadow-sm'
                  }
                `}
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? 'Закрыть меню' : 'Меню'}
          >
            {menuOpen ? (
              <X size={22} className={scrolled ? 'text-gray-900' : 'text-white'} />
            ) : (
              <Menu size={22} className={scrolled ? 'text-gray-900' : 'text-white'} />
            )}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md overflow-y-auto animate-[menu-open_0.2s_ease-out]">
          <nav className="flex flex-col p-6 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3.5 rounded-xl text-gray-700 dark:text-dark-text font-medium text-base hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 dark:border-dark-border my-3" />
            {loggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-gray-700 dark:text-dark-text font-medium text-base hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                >
                  <ClipboardList size={18} className="text-brand-500" />
                  Мои заказы
                </Link>
                <Link
                  href="/app/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-gray-700 dark:text-dark-text font-medium text-base hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                >
                  <User size={18} className="text-brand-500" />
                  Профиль
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 dark:text-dark-muted font-medium hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-3.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors"
                >
                  Зарегистрироваться
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
