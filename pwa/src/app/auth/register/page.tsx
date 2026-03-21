'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';

export default function AuthRegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role, phone, name, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(
          data.error === 'invalid_phone'
            ? 'Укажите корректный телефон'
            : data.error === 'invalid_password'
              ? 'Пароль не короче 6 символов'
              : data.error === 'invalid_name'
                ? 'Укажите имя'
                : 'Не удалось зарегистрироваться'
        );
        return;
      }
      router.push(role === 'worker' ? '/worker' : '/customer');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 pt-16">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <PageHeader title="Регистрация" backHref="/" />
        <Image
          src="/logo.png"
          alt="Подряд PRO"
          width={48}
          height={48}
          className="mx-auto rounded-xl mb-4"
        />
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4 p-4 pb-8">
          <p className="text-sm text-gray-600">
            Укажите роль и контакты — сессия сохранится в браузере.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-colors ${
                role === 'customer'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200'
              }`}
            >
              Я заказчик
            </button>
            <button
              type="button"
              onClick={() => setRole('worker')}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-colors ${
                role === 'worker'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200'
              }`}
            >
              Я исполнитель
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Телефон</label>
            <input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500 focus:ring-2"
              placeholder="+7 …"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Имя</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Пароль</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {pending ? 'Отправка…' : 'Зарегистрироваться'}
          </button>

          <Link href="/auth/login" className="block text-center text-sm font-medium text-brand-500 hover:underline">
            Уже есть аккаунт — войти
          </Link>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
