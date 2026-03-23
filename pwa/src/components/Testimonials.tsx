'use client';

interface Testimonial {
  name: string;
  city: string;
  initials: string;
  text: string;
  rating: number;
  type: 'person' | 'company';
  role?: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Алексей Морозов',
    city: 'Омск',
    initials: 'АМ',
    text: 'Заказывал грузчиков на переезд из 3-комнатной квартиры. Приехали втроём за 25 минут, работали аккуратно — ни одной царапины на мебели. Закажу ещё на дачу!',
    rating: 5,
    type: 'person',
    role: 'Частное лицо',
  },
  {
    name: 'ООО «СибСтрой»',
    city: 'Новосибирск',
    initials: 'СС',
    text: 'Регулярно привлекаем разнорабочих через Подряд PRO на строительные объекты. Удобно, что можно сразу арендовать технику со скидкой — экономим до 15% на каждом проекте.',
    rating: 5,
    type: 'company',
    role: 'Строительная компания',
  },
  {
    name: 'Ольга Ковалёва',
    city: 'Новосибирск',
    initials: 'ОК',
    text: 'После ремонта в офисе заказала генеральную уборку. Бригада из 4-х человек за полдня вычистила 200 м². Очень довольна — рекомендую коллегам.',
    rating: 5,
    type: 'person',
    role: 'Владелица офиса',
  },
  {
    name: 'ИП Петров В.А.',
    city: 'Омск',
    initials: 'ПВ',
    text: 'Используем платформу для сезонных работ — уборка снега, благоустройство территории. Заказываем рабочих + снегоуборщик в аренду. Удобно и экономно.',
    rating: 5,
    type: 'company',
    role: 'Управляющий ТСЖ',
  },
  {
    name: 'Дмитрий Волков',
    city: 'Омск',
    initials: 'ДВ',
    text: 'Нанимал бригаду на фундамент для бани. Приехали с плиткорезом и генератором — всё включено. За 3 дня залили, качество на совесть.',
    rating: 5,
    type: 'person',
    role: 'Частное лицо',
  },
  {
    name: '«РемонтОмск»',
    city: 'Омск',
    initials: 'РО',
    text: 'Нашли себе постоянных субподрядчиков через платформу. Берём исполнителей + перфораторы, болгарки в аренду — выгоднее, чем держать свой парк инструмента.',
    rating: 4,
    type: 'company',
    role: 'Ремонтная компания',
  },
  {
    name: 'Марина Степанова',
    city: 'Новосибирск',
    initials: 'МС',
    text: 'Заказала ремонт ванной под ключ. Строительная бригада сделала за 2 дня — плитка, сантехника, всё идеально. Оплата безопасная, это очень важно.',
    rating: 5,
    type: 'person',
    role: 'Частное лицо',
  },
  {
    name: 'ГК «Сибирский двор»',
    city: 'Новосибирск',
    initials: 'СД',
    text: 'Для наших объектов нужны десятки рабочих одновременно. Подряд PRO — единственная платформа в регионе, где можно быстро закрыть кадровый вопрос комплексно.',
    rating: 5,
    type: 'company',
    role: 'Девелопер',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Рейтинг: ${count} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill={i < count ? 'currentColor' : 'none'}
          stroke={i < count ? 'none' : 'currentColor'}
          className={`h-4 w-4 ${i < count ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function Testimonials() {
  return (
    <section className="bg-white dark:bg-dark-card py-16 md:py-20 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 mb-10">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-3 text-balance">
          Нам доверяют люди и компании
        </h2>
        <p className="text-center text-sm md:text-base text-gray-500 dark:text-dark-muted">
          Более 100 исполнителей, сотни выполненных заказов
        </p>
      </div>

      <div
        className="scroll-fade-x flex gap-4 px-6 overflow-x-auto snap-x snap-mandatory pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="snap-center shrink-0 w-[300px] card-premium p-6"
          >
            {/* Header: avatar + info */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  t.type === 'person'
                    ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300'
                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                }`}
              >
                {t.initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {t.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">
                  {t.city}
                  {t.role && (
                    <>
                      {' · '}
                      <span className="text-gray-400 dark:text-dark-muted">
                        {t.role}
                      </span>
                    </>
                  )}
                </p>
                {t.type === 'company' && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                    Организация
                  </span>
                )}
              </div>
            </div>

            {/* Stars */}
            <div className="mb-3">
              <Stars count={t.rating} />
            </div>

            {/* Quote */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              &laquo;{t.text}&raquo;
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
