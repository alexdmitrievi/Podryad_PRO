'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

interface WorkerData {
  worker: {
    name: string;
    username: string;
    rating: number;
    jobs_count: number;
    is_vip: boolean;
    skills: string;
    balance: number;
    phone?: string;
  };
  stats: {
    total_earned: number;
    pending_payout: number;
    paid_orders: number;
  };
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<boolean | null>(null);
  const [workerData, setWorkerData] = useState<WorkerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (data) => {
        const isAuth = data.authenticated === true;
        setAuth(isAuth);
        if (isAuth) {
          const r = await fetch('/api/workers/me');
          const json = r.ok ? await r.json() : null;
          return { isAuth, workerData: json };
        }
        return { isAuth: false, workerData: null };
      })
      .then(({ isAuth, workerData }) => {
        if (workerData) setWorkerData(workerData);
        else if (isAuth) setError('Профиль не найден. Зарегистрируйтесь через бота.');
      })
      .catch(() => setError('Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuth(false);
    setWorkerData(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <header className="bg-[#0088cc] text-white px-4 py-3">
          <h1 className="text-lg font-bold">👤 Профиль</h1>
          <p className="text-xs opacity-80">Загрузка...</p>
        </header>
        <div className="p-4 flex justify-center items-center min-h-[200px]">
          <div className="animate-pulse text-gray-400">⏳</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="bg-[#0088cc] text-white px-4 py-3">
        <h1 className="text-lg font-bold">👤 Личный кабинет</h1>
        <p className="text-xs opacity-80">
          {auth && workerData ? 'Ваша статистика и рейтинг' : 'Для исполнителей'}
        </p>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {!auth ? (
          <>
            <div className="bg-white rounded-2xl p-6 text-center space-y-4 shadow-sm border border-gray-100">
              <div className="text-5xl">🔐</div>
              <h2 className="font-bold text-xl">Войдите через Telegram</h2>
              <p className="text-gray-500 text-sm">
                Исполнители видят здесь рейтинг, заработок и историю заказов
              </p>
              <div className="flex justify-center [&_iframe]:!rounded-xl" id="telegram-login">
                <Script
                  id="tg-widget"
                  src="https://telegram.org/js/telegram-widget.js?22"
                  data-telegram-login={botName}
                  data-size="large"
                  data-auth-url={`${siteUrl}/auth/telegram`}
                  data-request-access="write"
                  strategy="lazyOnload"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                ⚠️ {error}. Зарегистрируйтесь через{' '}
                <a
                  href={`https://t.me/${botName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  @{botName}
                </a>
              </div>
            )}

            {workerData && (
              <>
                {/* Карточка профиля */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="font-bold text-xl text-gray-900">
                        {workerData.worker.name || workerData.worker.username || 'Исполнитель'}
                      </h2>
                      {workerData.worker.username && (
                        <p className="text-gray-500 text-sm">@{workerData.worker.username}</p>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      Выйти
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        ⭐ {workerData.worker.rating.toFixed(1)}
                      </p>
                      <p className="text-xs text-amber-700">Рейтинг</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        📋 {workerData.worker.jobs_count}
                      </p>
                      <p className="text-xs text-blue-700">Выполнено заказов</p>
                    </div>
                  </div>

                  {workerData.worker.is_vip && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                      <span className="text-xl">🌟</span>
                      <span className="font-medium text-amber-800 text-sm">VIP статус активен</span>
                    </div>
                  )}

                  {workerData.worker.skills && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Навыки:</span> {workerData.worker.skills}
                    </p>
                  )}
                </div>

                {/* Финансы */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-4">💰 Финансы</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Выплачено</span>
                      <span className="font-bold text-green-600">
                        {workerData.stats.total_earned.toLocaleString()}₽
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Ожидает выплаты</span>
                      <span className="font-bold text-amber-600">
                        {workerData.stats.pending_payout.toLocaleString()}₽
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Оплаченных заказов</span>
                      <span>{workerData.stats.paid_orders}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Услуги для заказчиков */}
        <div className="space-y-3 pt-4">
          <h3 className="font-semibold text-sm text-gray-700">Для заказчиков</h3>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-sm mb-2">🌟 VIP подписка</h4>
            <p className="text-gray-500 text-xs mb-3">Ранний доступ к заказам</p>
            <a
              href={`https://t.me/${botName}?start=vip`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0088cc] text-sm font-medium"
            >
              Подключить за 1000₽/мес →
            </a>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-sm mb-2">🏆 Подбор исполнителей</h4>
            <p className="text-gray-500 text-xs mb-3">ТОП-3 проверенных исполнителей</p>
            <a
              href={`https://t.me/${botName}?start=pick`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0088cc] text-sm font-medium"
            >
              Заказать подбор за 1000₽ →
            </a>
          </div>
        </div>

        <p className="text-gray-300 text-xs text-center pt-4">
          © {new Date().getFullYear()} Подряд PRO · podryad.pro
        </p>
      </div>
    </div>
  );
}
