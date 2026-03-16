'use client';

import Link from 'next/link';
import { Calculator } from 'lucide-react';
import MessengerLinks from './MessengerLinks';

export default function CostCalculator() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
          <Calculator size={20} className="text-brand-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900">Рассчитать стоимость</h3>
          <p className="text-xs text-gray-400">Индивидуально под вашу задачу</p>
        </div>
      </div>

      <p className="text-gray-500 text-sm leading-relaxed">
        Точная стоимость зависит от типа работ, количества людей, часов и адреса.
        Оставьте заявку — и мы пришлём расчёт в течение нескольких минут.
      </p>

      <Link
        href="/app/order"
        className="
          flex items-center justify-center gap-2 w-full
          bg-brand-500 text-white font-bold py-3 px-4 rounded-2xl
          hover:bg-brand-600 active:scale-[0.97]
          transition-all duration-200 text-sm shadow-sm
        "
      >
        <Calculator size={16} />
        Получить расчёт через форму
      </Link>

      <div className="flex items-center gap-3">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-400 font-medium">или напишите</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <MessengerLinks action="order" variant="inline" />
    </div>
  );
}
