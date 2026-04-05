import Link from 'next/link';
import { Tag, ArrowRight, Users, Truck, Package, Zap } from 'lucide-react';

const combos = [
  {
    left: { icon: Users, label: 'Бригада' },
    right: { icon: Truck, label: 'Техника' },
    discount: '−15%',
  },
  {
    left: { icon: Users, label: 'Бригада' },
    right: { icon: Package, label: 'Материалы' },
    discount: '−10%',
  },
  {
    left: { icon: Zap, label: 'Всё вместе' },
    right: null,
    discount: '−20%',
  },
];

export default function ComboOfferBanner() {
  return (
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-brand-500 rounded-xl p-8 md:p-10 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-12 w-40 h-40 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={18} className="text-white" />
              <span className="text-white/90 text-sm font-bold uppercase tracking-wider">Комбо-скидка</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight font-heading">
              Закажите вместе — сэкономьте до 20%
            </h2>
            <p className="text-white/80 mt-2 text-sm md:text-base">
              Чем больше услуг в одном заказе — тем выше скидка
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {combos.map((combo, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-3 flex-1"
                >
                  <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                    <combo.left.icon size={15} />
                    {combo.left.label}
                  </div>
                  {combo.right && (
                    <>
                      <span className="text-white/60 text-xs">+</span>
                      <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                        <combo.right.icon size={15} />
                        {combo.right.label}
                      </div>
                    </>
                  )}
                  <span className="ml-auto bg-white text-brand-500 text-xs font-extrabold px-2 py-0.5 rounded-lg flex-shrink-0">
                    {combo.discount}
                  </span>
                </div>
              ))}
            </div>

            {/* Offer for contractors */}
            <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 border border-white/20">
              <p className="text-white text-sm font-medium">
                Для исполнителей: скидка на аренду техники при работе через платформу
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/order/new?type=combo"
                className="inline-flex items-center gap-2 bg-white text-brand-500 font-bold py-3 px-7 rounded-xl text-sm hover:bg-blue-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer"
              >
                Заказать со скидкой
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
