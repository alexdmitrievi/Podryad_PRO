import Link from 'next/link';
import { Shield, CheckCircle2, Users, Star, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Тарифы — Подряд PRO' };

const customerFeatures = [
  'Итоговая стоимость — без скрытых доплат',
  'Безопасная сделка включена',
  'Комбо-скидка 15% при заказе из разных категорий',
  'Арбитраж и гарантия возврата',
  'Проверенные исполнители',
];

const workerFeatures = [
  'Никаких комиссий и подписок',
  'Вы устанавливаете свою ставку',
  'Получаете 100% своей ставки',
  'Автоматические выплаты на карту',
  'Безопасные сделки без наличных',
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-surface pt-16">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 px-4 py-12 text-white text-center">
        <h1 className="text-3xl font-extrabold mb-3">Прозрачные условия</h1>
        <p className="text-white/80 text-base max-w-md mx-auto">
          Честные тарифы для заказчиков и исполнителей — всё включено, ничего лишнего
        </p>
      </section>

      {/* Cards */}
      <section className="px-4 py-10 max-w-3xl mx-auto">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Для заказчиков */}
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-card border border-gray-100 dark:border-dark-border flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <Shield size={22} className="text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Для заказчиков</h2>
                <p className="text-xs text-gray-500 dark:text-dark-muted">Размещение заказов</p>
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {customerFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                  <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/order/new"
              className="w-full py-3 rounded-xl font-semibold text-sm bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              Разместить заказ <ArrowRight size={16} />
            </Link>
          </div>

          {/* Для исполнителей */}
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-card border-2 border-emerald-400 dark:border-emerald-500 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              БЕСПЛАТНО
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users size={22} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Для исполнителей</h2>
                <p className="text-xs text-gray-500 dark:text-dark-muted">Бригады и мастера</p>
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {workerFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/auth"
              className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              Стать исполнителем <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Why free for workers */}
        <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-800 flex items-start gap-3">
          <Star size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Почему бесплатно для исполнителей?</strong>
            {' '}Мы хотим, чтобы лучшие мастера работали на нашей площадке. Платформа зарабатывает на наценке от заказчика — исполнители получают свою ставку целиком.
          </p>
        </div>
      </section>
    </main>
  );
}
