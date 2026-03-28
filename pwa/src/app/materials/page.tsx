'use client';

import { Suspense } from 'react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import MaterialsForm from '@/components/MaterialsForm';

function MaterialsPageContent() {
  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-dark-bg pt-16">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PageHeader
          title="📦 Строительные материалы"
          subtitle="Получить каталог со скидкой 10% и расчёт сметы за 1 час"
          backHref="/"
        />

        <div className="max-w-lg mx-auto p-4 space-y-6 pb-10">
          {/* Description */}
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border shadow-sm">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Отправим каталог в Telegram без звонка. Выберите интересующие материалы и получите расчёт сметы в течение часа.
            </p>
          </div>

          {/* Form */}
          <MaterialsForm />

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">📋</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Каталог за 1 час</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">🎁</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Скидка 10%</p>
            </div>
          </div>

          {/* Available materials list */}
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Доступные материалы:</h3>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-lg">🏗️</span>
                <span>Бетон всех марок от производителя</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🛣️</span>
                <span>Битум БНД 100/130</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🪨</span>
                <span>Щебень всех марок</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🏖️</span>
                <span>Песок</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span>Печное топливо темное/светлое</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-dark-bg" />}>
      <MaterialsPageContent />
    </Suspense>
  );
}
