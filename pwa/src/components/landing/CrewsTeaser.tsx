import Link from 'next/link';
import { Users, Star, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const mockCrews = [
  {
    name: 'Бригада «Стройпрофи»',
    specialty: 'Монолитные и отделочные работы',
    size: '8 человек',
    rating: 4.9,
    orders: 43,
    verified: true,
  },
  {
    name: 'Бригада «Северный»',
    specialty: 'Земляные работы, демонтаж',
    size: '5 человек',
    rating: 4.8,
    orders: 28,
    verified: true,
  },
  {
    name: 'Бригада «Максимум»',
    specialty: 'Укладка асфальта, благоустройство',
    size: '12 человек',
    rating: 5.0,
    orders: 61,
    verified: true,
  },
];

export default function CrewsTeaser() {
  return (
    <section className="bg-gray-50 dark:bg-dark-bg py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 text-xs font-bold px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                <Users size={12} />
                Бригады в приоритете
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
                Команды от 3 до 15 человек
              </h2>
              <p className="text-gray-500 dark:text-dark-muted mt-2">
                Бригадир контролирует качество и отвечает за сроки
              </p>
            </div>
            <Link
              href="/dashboard?type=crew"
              className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm hover:underline flex-shrink-0"
            >
              Найти бригаду
              <ArrowRight size={14} />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mockCrews.map((crew, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-brand-500" />
                  </div>
                  {crew.verified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle size={10} />
                      Бригада
                    </span>
                  )}
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{crew.name}</p>
                <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">{crew.specialty}</p>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-dark-muted">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {crew.size}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400" fill="currentColor" />
                    {crew.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {crew.orders} заказов
                  </span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={200}>
          <div className="mt-8 bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-brand-100 dark:border-brand-800/30">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Есть своя бригада?</p>
              <p className="text-sm text-gray-500 dark:text-dark-muted mt-0.5">
                Зарегистрируйтесь и получайте заказы командой
              </p>
            </div>
            <Link
              href="/auth/register?role=crew"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all hover:-translate-y-0.5 active:scale-95 flex-shrink-0"
            >
              Подключить бригаду
              <ArrowRight size={15} />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
