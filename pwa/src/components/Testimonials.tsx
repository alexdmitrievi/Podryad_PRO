'use client';

const TESTIMONIALS = [
  {
    name: 'Алексей',
    city: 'Омск',
    initials: 'АМ',
    text: 'Грузчики приехали через 20 минут. Всё перенесли аккуратно, ничего не повредили. Буду заказывать ещё!',
  },
  {
    name: 'Ольга',
    city: 'Новосибирск',
    initials: 'ОК',
    text: 'Заказывала уборку офиса после ремонта. Очень довольна результатом — чисто и быстро.',
  },
  {
    name: 'Дмитрий',
    city: 'Омск',
    initials: 'ДВ',
    text: 'Удобная оплата, понятные цены. Нанимал разнорабочих на дачу — всё сделали в срок.',
  },
  {
    name: 'Марина',
    city: 'Новосибирск',
    initials: 'МС',
    text: 'Строительная бригада сделала ремонт ванной за 2 дня. Качество отличное, рекомендую!',
  },
  {
    name: 'Сергей',
    city: 'Омск',
    initials: 'СП',
    text: 'Арендовал перфоратор и заказал мастера. Скидка 15% — приятный бонус. Всем доволен.',
  },
];

export default function Testimonials() {
  return (
    <section className="bg-white dark:bg-dark-card py-12 md:py-16 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-8">
          Отзывы клиентов
        </h2>
      </div>
      <div
        className="flex gap-4 px-6 overflow-x-auto snap-x snap-mandatory pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name + t.city}
            className="snap-center shrink-0 w-[280px] bg-gray-50 dark:bg-dark-bg rounded-card p-5 border border-gray-100 dark:border-dark-border"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-sm">
                {t.initials}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">{t.city}</p>
              </div>
              <p className="ml-auto text-xs text-amber-500">★★★★★</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              «{t.text}»
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
