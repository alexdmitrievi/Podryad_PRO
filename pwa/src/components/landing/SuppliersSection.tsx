import Link from 'next/link';
import { BadgeCheck, Banknote, ShieldCheck, ArrowRight, Users } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const benefits = [
  { icon: BadgeCheck, label: 'Никаких комиссий' },
  { icon: Banknote, label: '100% ставки — ваши' },
  { icon: ShieldCheck, label: 'Гарантия оплаты' },
];

export default function SuppliersSection() {
  return (
    <section className="relative bg-gradient-to-br from-[#0a0c14] via-brand-900 to-brand-700 py-20 md:py-28 overflow-hidden">
      <div className="hero-pattern absolute inset-0" />
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left: copy */}
          <ScrollReveal delay={0}>
            <div>
              <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
                <Users size={12} />
                Исполнителям
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                Зарабатывайте с Подряд PRO — бесплатно
              </h2>
              <p className="text-white/60 mt-3 leading-relaxed">
                Регистрация без взносов. Берёте заказы, получаете ровно столько, сколько договорились.
              </p>

              <div className="mt-6 space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <b.icon size={15} className="text-white" />
                    </div>
                    <span className="text-white font-semibold text-sm">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Right: CTA buttons */}
          <ScrollReveal delay={100}>
            <div className="flex flex-col gap-4">
              <Link
                href="/auth/register?role=worker"
                className="flex items-center justify-between gap-3 bg-white text-brand-700 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-hero group"
              >
                <span>Стать исполнителем</span>
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/auth/register?role=crew"
                className="flex items-center justify-between gap-3 bg-white/10 text-white font-bold py-4 px-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <span>Подключить бригаду</span>
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="text-white/40 text-xs text-center mt-1">
                Уже более 200 исполнителей зарабатывают на платформе
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
