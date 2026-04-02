import Link from 'next/link';
import { CheckCircle2, AlertCircle, ArrowRight, Smartphone, CreditCard, Shield } from 'lucide-react';

export const metadata = { title: 'Самозанятость — Подряд PRO' };

const benefits = [
  {
    icon: Shield,
    title: 'Работайте официально',
    desc: 'Выплаты приходят на карту с автоматическим чеком. Никаких вопросов от банка.',
  },
  {
    icon: CreditCard,
    title: 'Налог всего 4%',
    desc: 'С доходов от физлиц — 4%, от ИП и организаций — 6%. Никаких взносов в ПФР и ФСС.',
  },
  {
    icon: Smartphone,
    title: 'Оформление за 10 минут',
    desc: 'Встаньте на учёт через приложение «Мой налог» или на сайте ФНС. Не нужно посещать налоговую.',
  },
];

const steps = [
  {
    n: '1',
    title: 'Скачайте «Мой налог»',
    desc: 'Доступно в App Store и Google Play. Вход через Госуслуги или ИНН + пароль от ЛК ФНС.',
  },
  {
    n: '2',
    title: 'Встаньте на учёт',
    desc: 'Укажите вид деятельности: «Строительство», «Ремонт» или другое. Постановка занимает 1–2 минуты.',
  },
  {
    n: '3',
    title: 'Привяжите карту в Подряд PRO',
    desc: 'В личном кабинете добавьте карту для выплат — мы сами отправляем вам деньги после выполнения заказа.',
  },
  {
    n: '4',
    title: 'Получайте заказы и выплаты',
    desc: 'Деньги приходят автоматически. Чек формируется в «Мой налог» по уведомлению от платформы.',
  },
];

export default function SelfEmployedPage() {
  return (
    <main className="min-h-screen bg-surface pt-16">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 px-4 py-12 text-white text-center">
        <h1 className="text-3xl font-extrabold mb-3">Самозанятость</h1>
        <p className="text-white/80 text-base max-w-md mx-auto">
          Работайте легально, платите минимальный налог и получайте выплаты автоматически
        </p>
        <Link
          href="/auth"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-gray-50 active:scale-[0.97] transition-all cursor-pointer"
        >
          Зарегистрироваться <ArrowRight size={16} />
        </Link>
      </section>

      <div className="max-w-xl mx-auto px-4 py-10 space-y-10">
        {/* Что такое самозанятость */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Что такое самозанятость?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Налог на профессиональный доход (НПД) — специальный режим для физических лиц, которые
            работают на себя без найма сотрудников. Подходит для мастеров, бригад и фрилансеров.
          </p>
          <div className="mt-3 flex items-start gap-2.5 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3.5 border border-amber-100 dark:border-amber-800">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>
              Лимит дохода — <strong>2,4 млн ₽ в год</strong>. При превышении нужно переходить на ИП.
            </span>
          </div>
        </section>

        {/* Преимущества */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Преимущества через Подряд PRO
          </h2>
          <div className="space-y-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <b.icon size={18} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{b.title}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Как оформить */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Как оформить через «Мой налог»
          </h2>
          <ol className="space-y-4">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">
                  {s.n}
                </span>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border space-y-4">
          <h2 className="font-bold text-gray-900 dark:text-white">Частые вопросы</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-100">Нужен ли расчётный счёт?</dt>
              <dd className="text-gray-500 dark:text-dark-muted mt-0.5">Нет. Выплаты приходят на любую личную карту физлица.</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-100">Как платить налог?</dt>
              <dd className="text-gray-500 dark:text-dark-muted mt-0.5">
                Приложение «Мой налог» само считает налог и напоминает об уплате раз в месяц.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-100">Подходит ли для бригады?</dt>
              <dd className="text-gray-500 dark:text-dark-muted mt-0.5">
                Да. Каждый участник бригады регистрируется как самозанятый отдельно. Выплаты
                распределяет бригадир вручную или через платформу.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-100">
                Обязательно ли быть самозанятым?
              </dt>
              <dd className="text-gray-500 dark:text-dark-muted mt-0.5">
                Нет. Но без статуса самозанятого или ИП выплаты возможны только через ЮMoney-кошелёк.
              </dd>
            </div>
          </dl>
        </section>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-dark-muted mb-3">
            Уже являетесь самозанятым или ИП?
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.97] transition-all cursor-pointer"
          >
            Зарегистрироваться → <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
