'use client';

import { FormEvent, Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_credentials: 'Неверный логин или пароль',
          user_not_found: 'Пользователь не найден',
          invalid_password: 'Неверный пароль',
        };
        setError(msgs[data.error || ''] || 'Не удалось войти');
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(false);
    }
  }

  const inputCls =
    'w-full rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3.5 text-sm dark:text-white outline-none ring-brand-500 focus:ring-2 transition-shadow';

  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Телефон или email
          </label>
          <input
            type="text"
            required
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className={inputCls}
            placeholder="+7 (999) 123-45-67 или mail@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Пароль
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="Введите пароль"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-brand-500 py-4 text-sm font-bold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 shadow-sm"
        >
          {pending ? 'Вход...' : 'Войти'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-gray-200 dark:bg-dark-border flex-1" />
        <span className="text-xs text-gray-400 font-medium">или</span>
        <div className="h-px bg-gray-200 dark:bg-dark-border flex-1" />
      </div>

      {/* Telegram */}
      <a
        href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot'}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#2AABEE] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#229ED9] active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
        Войти через Telegram
      </a>

      {/* MAX hint */}
      <div className="mt-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
          Пользуетесь MAX?
        </p>
        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
          Напишите нам в{' '}
          <a
            href={process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            MAX
          </a>
          {' '}ваше имя, телефон и роль (заказчик/исполнитель) — мы создадим аккаунт и пришлём данные для входа.
        </p>
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-dark-muted mt-6">
        Нет аккаунта?{' '}
        <Link href="/auth/register" className="font-medium text-brand-500 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border px-5 pt-14 pb-6">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <Image src="/logo.png" alt="Подряд PRO" width={44} height={44} className="rounded-xl mb-3" />
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Вход в аккаунт</h1>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
            Телефон, email или Telegram
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center py-20 text-sm text-gray-400">
              Загрузка...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
