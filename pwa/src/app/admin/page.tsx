'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, UserPlus, Lock, ExternalLink } from 'lucide-react';

interface GeneratedUser {
  userId: string;
  name: string;
  phone: string;
  accessLink: string;
}

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedUser | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedUser[]>([]);

  const handleAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      if (pin.trim().length < 4) {
        setAuthError('Введите PIN (минимум 4 символа)');
        return;
      }
      setAuthLoading(true);
      try {
        const res = await fetch('/api/admin/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin.trim() }),
        });
        const data = await res.json();
        if (data.valid) {
          setAuthenticated(true);
        } else {
          setAuthError('Неверный PIN');
        }
      } catch {
        setAuthError('Ошибка проверки');
      } finally {
        setAuthLoading(false);
      }
    },
    [pin]
  );

  const handleGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setResult(null);
      setCopied(false);
      setLoading(true);

      try {
        const res = await fetch('/api/admin/generate-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, name: name.trim(), phone: phone.trim() }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 403) {
            setAuthenticated(false);
            setAuthError('Неверный PIN');
          }
          setError(data.error || 'Ошибка');
          return;
        }

        const user: GeneratedUser = {
          userId: data.userId,
          name: data.name,
          phone: data.phone,
          accessLink: data.accessLink,
        };
        setResult(user);
        setHistory((prev) => [user, ...prev]);
        setName('');
        setPhone('');
      } catch {
        setError('Ошибка сети');
      } finally {
        setLoading(false);
      }
    },
    [pin, name, phone]
  );

  const copyLink = useCallback(
    (link: string) => {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    []
  );

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <form
          onSubmit={handleAuth}
          className="bg-white rounded-3xl p-8 shadow-card border border-gray-100 w-full max-w-sm space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
              <Lock size={24} className="text-brand-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
            <p className="text-sm text-gray-500">Введите PIN для доступа</p>
          </div>

          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN-код"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            autoFocus
          />

          {authError && (
            <p className="text-red-500 text-sm text-center">{authError}</p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98] transition-all shadow-sm disabled:opacity-70"
          >
            {authLoading ? 'Проверка...' : 'Войти'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-r from-brand-900 to-brand-600 px-4 py-6 text-white">
        <h1 className="text-xl font-bold">🔧 Админ-панель</h1>
        <p className="text-sm text-white/70 mt-1">
          Ручное добавление пользователей
        </p>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-5 pb-8">
        {/* Form */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus size={20} className="text-brand-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Новый пользователь
            </h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иванов Иван"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 900 123-45-67"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Генерация...' : 'Создать ссылку доступа'}
            </button>
          </form>
        </section>

        {/* Result */}
        {result && (
          <section className="bg-white rounded-3xl p-6 shadow-card border border-emerald-200 space-y-4">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-800">
                Ссылка создана!
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Имя</span>
                <span className="font-medium text-gray-900">
                  {result.name}
                </span>
              </div>
              {result.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Телефон</span>
                  <span className="font-medium text-gray-900">
                    {result.phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-mono text-xs text-gray-700">
                  {result.userId}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2">Ссылка для входа:</p>
              <p className="text-xs font-mono text-brand-600 break-all leading-relaxed">
                {result.accessLink}
              </p>
            </div>

            <button
              onClick={() => copyLink(result.accessLink)}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check size={16} /> Скопировано!
                </>
              ) : (
                <>
                  <Copy size={16} /> Скопировать ссылку
                </>
              )}
            </button>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                📋 Не забудьте добавить в Google Sheets:
              </p>
              <ol className="text-xs text-amber-700 space-y-1.5">
                <li>
                  1. Откройте таблицу → лист <b>Workers</b>
                </li>
                <li>
                  2. Добавьте строку: telegram_id = <code className="bg-amber-100 px-1 rounded font-mono">{result.userId}</code>
                </li>
                <li>3. Заполните name, phone, skills</li>
              </ol>
              <a
                href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_SHEETS_ID || '1gEHLSNMQIIxieDdHjrvgE15_AkoJleuWKLRajZIOCk'}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-amber-800 font-medium underline underline-offset-2"
              >
                Открыть таблицу <ExternalLink size={12} />
              </a>
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 1 && (
          <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">
              Созданные ссылки ({history.length})
            </h3>
            <div className="space-y-3">
              {history.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {u.userId}
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(u.accessLink)}
                    className="text-brand-500 hover:text-brand-700 p-2"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instructions */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3">📖 Как это работает</h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Пользователь пишет вам в MAX</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Вы создаёте ссылку здесь (имя + телефон)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Добавляете пользователя в Google Sheets (лист Workers)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Отправляете ссылку пользователю в MAX</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                5
              </span>
              <span>Пользователь открывает ссылку → попадает в свой ЛК</span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
