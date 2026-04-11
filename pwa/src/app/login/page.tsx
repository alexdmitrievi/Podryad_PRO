'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PhoneInput, { isValidPhone, getRawPhone } from '@/components/ui/PhoneInput';
import { showToast } from '@/components/ui/Toast';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) { showToast('Введите корректный номер телефона', 'error'); return; }
    if (!password) { showToast('Введите пароль', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: getRawPhone(phone), password }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Добро пожаловать!', 'success');
        router.push('/account');
      } else {
        showToast(data.error || 'Ошибка входа', 'error');
      }
    } catch {
      showToast('Ошибка соединения', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-6">
          ← Главная
        </Link>

        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-card p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#2F5BFF] flex items-center justify-center mx-auto mb-3">
              <LogIn className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Вход</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Личный кабинет заказчика</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Телефон</label>
              <PhoneInput value={phone} onChange={setPhone} placeholder="+7 (999) 000-00-00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ваш пароль"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]"
                required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#2F5BFF] hover:bg-[#2d35a8] text-white font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-50">
              {loading ? 'Вход…' : 'Войти'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-[#2F5BFF] font-semibold hover:underline">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
