'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-dark-bg">
      <PageHeader title="Вход" backHref="/dashboard" />
      <div className="mx-auto max-w-md space-y-4 p-4 pb-8">
        <Image
          src="/logo.png"
          alt="Подряд PRO"
          width={48}
          height={48}
          className="mx-auto rounded-xl mb-4"
        />
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Чтобы откликаться на заказы, авторизуйтесь через Telegram-бота — сессия
          сохранится в браузере.
        </p>
        <a
          href={`https://t.me/${botName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-2xl bg-brand-500 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:opacity-95 active:scale-[0.99]"
        >
          Открыть Telegram-бота
        </a>
        <Link
          href={redirect}
          className="block text-center text-sm font-medium text-brand-500 hover:underline"
        >
          ← Вернуться к доске заказов
        </Link>
      </div>
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-dark-bg pt-16">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm text-gray-500 dark:text-dark-muted">
              Загрузка…
            </div>
          }
        >
          <LoginContent />
        </Suspense>
      </div>
      <BottomNav />
    </div>
  );
}
