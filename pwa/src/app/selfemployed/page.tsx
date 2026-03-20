'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

const METHODS = [
  {
    recommended: true,
    icon: '🌐',
    title: 'Через сайт «Мой налог»',
    description: 'Самый быстрый способ — прямо с телефона.',
    steps: [
      'Откройте сайт ФНС',
      'Выберите способ входа: по телефону, через Госуслуги, через личный кабинет ФНС или по паспорту (фото + селфи)',
      'Подтвердите регистрацию',
      'Готово!',
    ],
    buttonText: 'Открыть «Мой налог» →',
    url: 'https://lknpd.nalog.ru/auth/register/about',
  },
  {
    recommended: false,
    icon: '🏛',
    title: 'Через Госуслуги',
    description: 'Если у вас уже есть подтверждённый аккаунт.',
    steps: [
      'Войдите на Госуслуги',
      'Найдите «Регистрация в качестве самозанятого»',
      'Заполните заявление',
      'Статус присвоят автоматически',
    ],
    buttonText: 'Открыть Госуслуги →',
    url: 'https://www.gosuslugi.ru',
  },
  {
    recommended: false,
    icon: '📱',
    title: 'Через приложение «Мой налог»',
    description: 'Удобно если предпочитаете приложения.',
    steps: [
      'Скачайте «Мой налог» из RuStore, AppGallery или NashStore',
      'Нажмите «Зарегистрироваться»',
      'Войдите через Госуслуги или по паспорту (фото + селфи)',
      'Подтвердите — готово!',
    ],
    buttonText: 'Скачать из RuStore →',
    url: 'https://apps.rustore.ru/app/com.gnivts.nakhodki',
  },
] as const;

const FAQ = [
  { q: 'Сколько стоит регистрация?', a: 'Бесплатно.' },
  {
    q: 'Нужно ли увольняться с основной работы?',
    a: 'Нет. Самозанятость совмещается с трудовым договором.',
  },
  {
    q: 'Какой налог?',
    a: '4% при работе с физлицами, 6% — с юрлицами. Приложение «Мой налог» считает автоматически.',
  },
  {
    q: 'Как выбивать чеки?',
    a: 'В приложении «Мой налог»: указываете сумму, наименование услуги, отправляете. 30 секунд.',
  },
  {
    q: 'Есть лимит дохода?',
    a: '2.4 млн ₽/год. Для подработки более чем достаточно.',
  },
  {
    q: 'Можно работать без статуса самозанятого?',
    a: 'Да. Но самозанятые получают заказы первыми и выплаты быстрее.',
  },
] as const;

export default function SelfemployedPage() {
  const [openFaq, setOpenFaq] = useState<number>(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="📋 Как стать самозанятым"
        subtitle="Инструкция — 5 минут"
        backHref="/worker"
        backLabel="← Исполнителям"
      />

      <div className="max-w-lg mx-auto p-4 space-y-6 pb-10">
        {/* ── Зачем это нужно ── */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Зачем статус самозанятого?
          </h2>

          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              Самозанятые исполнители получают заказы{' '}
              <span className="font-bold text-gray-900">В ПРИОРИТЕТЕ</span>.
              Кроме того, выплаты самозанятым проходят быстрее —
              в течение 24 часов после подтверждения заказа.
            </p>

            <p>
              Без статуса самозанятого вы тоже можете брать заказы,
              но при прочих равных приоритет у самозанятых.
            </p>

            <div>
              <p className="font-semibold text-gray-800 mb-2">
                Самозанятость — это НЕ ИП:
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  Налог всего 4-6%
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  Нет отчётности и бухгалтерии
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  Нет страховых взносов
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  Можно совмещать с основной работой
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  Регистрация за 5 минут онлайн
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 3 способа регистрации ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 px-1">
            3 способа регистрации
          </h2>

          {METHODS.map((m, i) => (
            <div
              key={i}
              className={`
                bg-white rounded-3xl p-5 shadow-card border
                ${m.recommended
                  ? 'border-amber-300 ring-2 ring-amber-100'
                  : 'border-gray-100'}
              `}
            >
              {m.recommended && (
                <span className="inline-block text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-3">
                  ⭐ Рекомендуем
                </span>
              )}

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{m.icon}</span>
                <h3 className="font-bold text-gray-900">{m.title}</h3>
              </div>

              <p className="text-sm text-gray-500 mb-4">{m.description}</p>

              <ol className="space-y-2 mb-5">
                {m.steps.map((step, si) => (
                  <li key={si} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                      {si + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  block w-full text-center py-3 rounded-2xl font-semibold text-sm
                  transition-all hover:brightness-95 active:scale-[0.98]
                  ${m.recommended
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
              >
                {m.buttonText}
              </a>
            </div>
          ))}
        </section>

        {/* ── Что дальше ── */}
        <section className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Что дальше?
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Зарегистрировались? Вернитесь в бот{' '}
            <span className="font-semibold text-gray-900">@{botName}</span>{' '}
            и подтвердите статус самозанятого. После проверки модератором
            (обычно 1-2 часа) вы будете получать заказы в приоритетном порядке.
          </p>

          <div className="space-y-3">
            <a
              href={`https://t.me/${botName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-[0.98] shadow-sm shadow-brand-500/20"
            >
              Открыть бот →
            </a>
            <Link
              href="/dashboard"
              className="block w-full text-center py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              Смотреть заказы →
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 px-1 mb-4">
            Частые вопросы
          </h2>

          <div className="space-y-2">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-all hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <span className="font-semibold text-sm text-gray-900 pr-4">
                      {item.q}
                    </span>
                    <span
                      className={`
                        text-gray-400 text-lg transition-transform duration-300
                        ${isOpen ? 'rotate-45' : 'rotate-0'}
                      `}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className="transition-all duration-300 ease-in-out overflow-hidden"
                    style={{ maxHeight: isOpen ? '200px' : '0px' }}
                  >
                    <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
