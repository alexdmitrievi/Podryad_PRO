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
    <section className="py-10 md:py-16 px-3 sm:px-4 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div
          className="relative rounded-2xl p-5 sm:p-8 md:p-10 overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #2F5BFF 0%, #2548d9 40%, #6C5CE7 100%)',
          }}
        >
          {/* Decorative orbs */}
          <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10 blur-sm pointer-events-none" />
          <div className="absolute right-8 -bottom-14 w-44 h-44 rounded-full bg-violet/30 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 bottom-0 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
          {/* Grid overlay */}
          <div className="absolute inset-0 hero-grid opacity-40 pointer-events-none" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0">
                <Tag size={13} className="text-white" />
              </div>
              <span className="text-white/80 text-[11px] font-bold uppercase tracking-widest">Комбо-скидка</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight font-heading tracking-tight mb-1.5">
              Закажите вместе —<br className="sm:hidden" /> сэкономьте до&nbsp;20%
            </h2>
            <p className="text-white/65 text-sm mb-5">
              Чем больше услуг в одном заказе — тем выше скидка
            </p>

            {/* Combo rows */}
            <div className="grid gap-2">
              {combos.map((combo, i) => (
                <div
                  key={i}
                  className="flex items-center rounded-xl px-3 py-2.5 gap-2"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                >
                  {/* Left service */}
                  <div className="flex items-center gap-1.5 text-white font-semibold text-sm flex-shrink-0">
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-white/15 flex-shrink-0">
                      <combo.left.icon size={12} />
                    </div>
                    <span>{combo.left.label}</span>
                  </div>

                  {/* Right service */}
                  {combo.right && (
                    <>
                      <span className="text-white/40 text-xs font-bold flex-shrink-0">+</span>
                      <div className="flex items-center gap-1.5 text-white font-semibold text-sm flex-shrink-0">
                        <div className="w-5 h-5 rounded flex items-center justify-center bg-white/15 flex-shrink-0">
                          <combo.right.icon size={12} />
                        </div>
                        <span>{combo.right.label}</span>
                      </div>
                    </>
                  )}

                  {/* Discount badge — pushed to right */}
                  <span className="ml-auto flex-shrink-0 bg-white text-brand-500 text-xs font-extrabold px-2 py-0.5 rounded-lg shadow-sm whitespace-nowrap">
                    {combo.discount}
                  </span>
                </div>
              ))}
            </div>

            {/* Info for contractors */}
            <div className="mt-3 rounded-xl px-3 py-2.5 border border-white/15" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <p className="text-white/70 text-xs sm:text-sm font-medium flex items-start gap-2">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-yellow-300 flex-shrink-0 mt-0.5" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Для исполнителей: скидка на аренду техники при работе через платформу
              </p>
            </div>

            {/* CTA */}
            <div className="mt-5">
              <Link
                href="/order/new?type=combo"
                className="btn-shine inline-flex items-center gap-2 bg-white text-brand-500 hover:bg-blue-50 font-bold py-3 px-6 rounded-xl text-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer"
              >
                Заказать со скидкой
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
