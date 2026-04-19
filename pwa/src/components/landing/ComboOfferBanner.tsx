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
        <div className="relative rounded-2xl p-8 md:p-10 overflow-hidden shadow-xl" style={{
          background: 'linear-gradient(135deg, #2F5BFF 0%, #2548d9 40%, #6C5CE7 100%)',
        }}>
          {/* Decorative orbs */}
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/10 blur-sm pointer-events-none" />
          <div className="absolute right-10 -bottom-16 w-52 h-52 rounded-full bg-violet/30 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 bottom-0 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />
          {/* Grid overlay */}
          <div className="absolute inset-0 hero-grid opacity-40 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                <Tag size={14} className="text-white" />
              </div>
              <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Комбо-скидка</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight font-heading tracking-tight">
              Закажите вместе — сэкономьте до&nbsp;20%
            </h2>
            <p className="text-white/65 mt-2 text-sm md:text-base">
              Чем больше услуг в одном заказе — тем выше скидка
            </p>

            <div className="mt-6 grid gap-2.5">
              {combos.map((combo, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 hover:bg-white/25"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                >
                  <div className="flex items-center gap-2 text-white font-semibold text-sm min-w-0">
                    <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0">
                      <combo.left.icon size={13} />
                    </div>
                    {combo.left.label}
                  </div>
                  {combo.right && (
                    <>
                      <span className="text-white/40 text-xs font-bold">+</span>
                      <div className="flex items-center gap-2 text-white font-semibold text-sm min-w-0">
                        <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0">
                          <combo.right.icon size={13} />
                        </div>
                        {combo.right.label}
                      </div>
                    </>
                  )}
                  <div className="ml-auto flex-shrink-0">
                    <span className="bg-white text-brand-500 text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                      {combo.discount}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Offer for contractors */}
            <div className="mt-4 rounded-xl px-4 py-3 border border-white/15" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <p className="text-white/70 text-sm font-medium flex items-center gap-2">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-yellow-300 flex-shrink-0" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Для исполнителей: скидка на аренду техники при работе через платформу
              </p>
            </div>

            <div className="mt-7">
              <Link
                href="/order/new?type=combo"
                className="btn-shine inline-flex items-center gap-2 bg-white text-brand-500 hover:bg-blue-50 font-bold py-3.5 px-7 rounded-xl text-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer"
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
