import Link from 'next/link';
import { Tag, ArrowRight, Users, Truck, Package, HardHat } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const combos = [
  {
    left: { icon: Users, label: 'Бригада' },
    right: { icon: Truck, label: 'Самосвал' },
  },
  {
    left: { icon: HardHat, label: 'Грузчики' },
    right: { icon: Package, label: 'Бетон' },
  },
];

export default function ComboOfferBanner() {
  return (
    <section className="bg-white dark:bg-dark-card py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal delay={0}>
          <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-8 md:p-10 overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
            <div className="absolute -right-4 -bottom-12 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={18} className="text-white" />
                <span className="text-white/90 text-sm font-bold uppercase tracking-wider">Комбо-скидка</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                Закажите вместе — сэкономьте 15%
              </h2>
              <p className="text-white/80 mt-2 text-sm md:text-base">
                При заказе рабочих и техники (или материалов) одновременно
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
                    <span className="text-white/60 text-xs">+</span>
                    <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                      <combo.right.icon size={15} />
                      {combo.right.label}
                    </div>
                    <span className="ml-auto bg-white text-orange-600 text-xs font-extrabold px-2 py-0.5 rounded-lg flex-shrink-0">
                      −15%
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href="/app/order"
                  className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold py-3 px-7 rounded-xl text-sm hover:bg-orange-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-md"
                >
                  Заказать со скидкой
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
