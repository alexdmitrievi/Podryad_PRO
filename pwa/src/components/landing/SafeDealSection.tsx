import { Lock, HardHat, CheckCircle2, Banknote, RotateCcw, BadgeCheck, ShieldCheck } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const customerSteps = [
  {
    icon: Lock,
    label: 'Оплачиваете — заморозка',
    desc: 'Деньги резервируются, но не уходят исполнителю',
  },
  {
    icon: HardHat,
    label: 'Работа идёт — на гарантии',
    desc: 'Пока работа не принята, средства под защитой',
  },
  {
    icon: CheckCircle2,
    label: 'Подтверждаете — выплата',
    desc: 'Нажмите «Принять» — деньги поступают исполнителю',
  },
];

const workerBenefits = [
  { icon: BadgeCheck, label: 'Полностью бесплатно' },
  { icon: Banknote, label: '100% вашей ставки' },
  { icon: ShieldCheck, label: 'Гарантия оплаты' },
];

export default function SafeDealSection() {
  return (
    <section className="bg-gray-50 dark:bg-dark-bg py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal delay={0}>
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Lock size={12} />
              Безопасная сделка
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              Ваши деньги под защитой
            </h2>
            <p className="text-gray-500 dark:text-dark-muted mt-3 max-w-xl mx-auto">
              Оплата по СБП или счёту — исполнитель выезжает только после подтверждения платежа
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: for customers */}
          <ScrollReveal delay={0}>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-dark-border h-full">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-dark-muted mb-5">
                Для заказчиков
              </p>
              <div className="space-y-5">
                {customerSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                        <step.icon size={18} className="text-brand-500" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{step.label}</p>
                      <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 border border-amber-100 dark:border-amber-800/30">
                <RotateCcw size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  Если что-то не так — вернём деньги
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: for workers */}
          <ScrollReveal delay={100}>
            <div className="bg-gradient-to-br from-brand-900 to-brand-700 rounded-2xl p-6 md:p-8 h-full flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-5">
                  Для исполнителей
                </p>
                <div className="space-y-4">
                  {workerBenefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <b.icon size={16} className="text-white" />
                      </div>
                      <p className="text-white font-semibold">{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-white/60 text-sm leading-relaxed">
                  Платформа не берёт комиссию с исполнителей. Вы получаете ровно столько, сколько указали в отклике.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
