'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface Rate {
  work_type: string;
  client_rate: number;
  min_hours: number;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  'грузчики': '📦 Грузчики',
  'уборка': '🧹 Уборка',
  'стройка': '🏗 Стройка',
  'разнорабочие': '🔧 Разнорабочие',
  'другое': '📋 Другое',
};

export default function PaymentsPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRates(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="💳 Тарифы" subtitle="Безопасные платежи через ЮKassa" />

      <div className="p-4 max-w-md mx-auto space-y-5 pb-8">

        {/* ══ БЛОК ДЛЯ ЗАКАЗЧИКА ══ */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-lg font-bold text-gray-900">Для заказчиков</h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Стоимость зависит от типа работ, количества людей и часов.
          </p>

          {/* Таблица тарифов — только client_rate */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={22} className="text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl overflow-hidden mb-5">
              <div className="grid grid-cols-3 gap-px bg-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="bg-gray-50 px-4 py-2.5">Работа</div>
                <div className="bg-gray-50 px-4 py-2.5 text-right">₽/час</div>
                <div className="bg-gray-50 px-4 py-2.5 text-right">Мин. часы</div>
              </div>
              {rates.map((rate, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-px bg-gray-200"
                >
                  <div className="bg-white px-4 py-3 text-sm text-gray-800 font-medium">
                    {WORK_TYPE_LABELS[rate.work_type] || rate.work_type}
                  </div>
                  <div className="bg-white px-4 py-3 text-sm text-right font-bold text-gray-900">
                    {rate.client_rate.toLocaleString('ru-RU')}₽
                  </div>
                  <div className="bg-white px-4 py-3 text-sm text-right text-gray-500">
                    {rate.min_hours} ч
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Как проходит оплата */}
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Как проходит оплата:</h3>
          <ol className="space-y-2.5 mb-5">
            {[
              'Вы оформляете заказ — система рассчитывает стоимость',
              'Оплачиваете через ЮKassa (карта, SBP, кошелёк)',
              'Заказ публикуется, исполнитель откликается',
              'Работа выполнена — вы подтверждаете и оцениваете',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {/* Гарантии */}
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h3 className="font-semibold text-emerald-800 text-sm mb-2">🛡 Гарантии:</h3>
            <ul className="space-y-1.5 text-sm text-emerald-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">—</span>
                Если исполнитель не вышел — полный возврат
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">—</span>
                Деньги списываются только после вашего подтверждения
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">—</span>
                Все расчёты официальные
              </li>
            </ul>
          </div>
        </section>

        {/* ══ БЛОК ДЛЯ ИСПОЛНИТЕЛЯ ══ */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💸</span>
            <h2 className="text-lg font-bold text-gray-900">Для исполнителей</h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Ставка указывается в каждом заказе. Вы видите сумму ДО того,
            как берёте заказ.
          </p>

          {/* Как получить выплату */}
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Как получить выплату:</h3>
          <ol className="space-y-2.5 mb-5">
            {[
              'Вы берёте заказ и выполняете работу',
              'Заказчик подтверждает и ставит оценку (нужна 3+)',
              'Выплата на карту в течение 24 часов',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {/* Самозанятые */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-4">
            <p className="text-sm text-amber-800 font-semibold mb-1">
              ⚡ Самозанятые получают заказы в приоритете
            </p>
            <Link
              href="/selfemployed"
              className="text-sm text-amber-700 font-medium underline underline-offset-2 hover:text-amber-900 transition-colors"
            >
              Как оформить за 5 минут →
            </Link>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed">
            💡 Нет статуса самозанятого? Вы всё равно можете брать заказы,
            но самозанятые исполнители получают их первыми.
          </p>
        </section>
      </div>
    </div>
  );
}
