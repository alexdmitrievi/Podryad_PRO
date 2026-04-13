'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function StatusPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <svg className="h-14 w-14 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Заявка принята</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Ваш заказ <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{id}</span> зарегистрирован.
            Менеджер свяжется с вами для уточнения деталей и выставит счёт&nbsp;или пришлёт реквизиты&nbsp;СБП.
          </p>
        </div>

        <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4 text-left space-y-2.5">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Что дальше</p>
          {[
            'Менеджер проверит заявку и назначит цену',
            'Вам пришлют реквизиты для оплаты (СБП или счёт)',
            'После оплаты — исполнитель выйдет на объект',
            'По завершении работ подтвердите выполнение',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-sm text-gray-600">{step}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/my"
            className="block w-full text-center py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
          >
            Мои заказы
          </Link>
          <Link
            href="/"
            className="block w-full text-center py-2.5 rounded-xl text-gray-500 text-sm hover:underline"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

