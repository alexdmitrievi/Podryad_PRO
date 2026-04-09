'use client';

import { useState } from 'react';

type City = 'omsk' | 'novosibirsk';
type ContactMethod = 'MAX' | 'Telegram' | 'Позвонить' | 'Email';

const CITY_LABELS: Record<City, string> = {
  omsk: 'Омск',
  novosibirsk: 'Новосибирск',
};

const SPECIALTY_OPTIONS = [
  'Грузчик',
  'Разнорабочий',
  'Строитель',
  'Уборка территории',
  'Водитель техники',
  'Благоустройство',
  'Другое',
];

const CONTACT_METHODS: { id: ContactMethod; label: string; activeClass: string }[] = [
  { id: 'MAX', label: 'MAX', activeClass: 'bg-max text-white border-max' },
  { id: 'Telegram', label: 'Telegram', activeClass: 'bg-brand-500 text-white border-brand-500' },
  { id: 'Позвонить', label: 'Позвонить', activeClass: 'bg-success-500 text-white border-success-500' },
  { id: 'Email', label: 'Email', activeClass: 'bg-violet text-white border-violet' },
];

export default function JoinPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<City>('omsk');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [preferredContact, setPreferredContact] = useState<ContactMethod>('MAX');
  const [about, setAbout] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleSpecialty(spec: string) {
    setSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setLoading(true);
    try {
      await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          city,
          specialties,
          experience,
          preferred_contact: preferredContact,
          about,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Header */}
      <div className="section-gradient py-14 sm:py-16 px-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading mb-3">
          Стать исполнителем
        </h1>
        <p className="text-white/75 text-base sm:text-lg">
          Платформа бесплатна. Получайте заказы без комиссий.
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-lg mx-auto px-4 py-12">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center shadow-elevated relative overflow-hidden">
            <div className="confetti-container">
              {[...Array(8)].map((_, i) => <span key={i} className="confetti-dot" />)}
            </div>
            <div className="success-icon mx-auto mb-4">
              <svg
                className="text-green-600 success-check"
                width="48"
                height="48"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-green-700 font-bold text-xl mb-1">Анкета отправлена!</p>
            <p className="text-green-600 text-sm">Мы свяжемся с вами.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 sm:p-8 shadow-elevated border border-gray-100/80 space-y-6"
          >
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
              />
            </div>

            {/* City toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Город</label>
              <div className="grid grid-cols-2 gap-2">
                {(['omsk', 'novosibirsk'] as City[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                      city === c
                        ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500 hover:shadow-sm'
                    }`}
                  >
                    {CITY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Specialties multi-select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Специализация
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map((spec) => {
                  const active = specialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer min-h-[48px] ${
                        active
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500 hover:shadow-sm'
                      }`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Опыт работы
              </label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Например: 5 лет в строительстве"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
              />
            </div>

            {/* Preferred contact */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Предпочтительная связь
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CONTACT_METHODS.map((m) => {
                  const active = preferredContact === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPreferredContact(m.id)}
                      className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        active
                          ? m.activeClass
                          : 'bg-white text-gray-700 border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">О себе</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={3}
                placeholder="Расскажите о себе, своём оборудовании или команде..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow"
              />
            </div>

            {/* 152-ФЗ consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Я даю согласие на обработку персональных данных в соответствии
                с&nbsp;
                <a href="/privacy" className="text-brand-500 underline">
                  Федеральным законом №152-ФЗ
                </a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !consent}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold min-h-[56px] py-4 rounded-xl w-full text-base transition-all hover:shadow-glow-hover disabled:opacity-50 cursor-pointer btn-press"
            >
              {loading ? 'Отправляем...' : 'Отправить анкету'}
            </button>
          </form>
        )}

        {/* Self-employed info */}
        <div className="mt-12 bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          {/* Priority badge */}
          <div className="bg-gradient-to-r from-brand-500 to-[#6C5CE7] px-6 py-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Самозанятые получают заказы в приоритете
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#2B2B2B] mb-2">Как стать самозанятым</h3>
              <p className="text-gray-500 text-sm">Оформляется через режим НПД — онлайн за несколько минут, без визита в налоговую.</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-[#2B2B2B] mb-2">Кому подходит</h4>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">&#10003;</span>Физлицам и ИП без сотрудников</li>
                <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">&#10003;</span>Доход до 2,4 млн &#8381;/год</li>
                <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">&#10003;</span>Услуги, работы или товары собственного производства</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-[#2B2B2B] mb-2">Оформление за 5 шагов</h4>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xs flex items-center justify-center">1</span><span>Скачайте приложение &laquo;Мой налог&raquo;, или зайдите на Госуслуги / ЛК налоговой / банк-партнёр</span></li>
                <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xs flex items-center justify-center">2</span><span>Подготовьте паспорт и ИНН</span></li>
                <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xs flex items-center justify-center">3</span><span>Заполните заявление и укажите регион</span></li>
                <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xs flex items-center justify-center">4</span><span>Подтвердите регистрацию</span></li>
                <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xs flex items-center justify-center">5</span><span>Дождитесь уведомления о постановке на учёт</span></li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-lg p-4 text-center">
                <div className="text-2xl font-extrabold text-brand-500 font-heading">4%</div>
                <div className="text-xs text-gray-500 mt-1">налог с физлиц</div>
              </div>
              <div className="bg-surface rounded-lg p-4 text-center">
                <div className="text-2xl font-extrabold text-[#6C5CE7] font-heading">6%</div>
                <div className="text-xs text-gray-500 mt-1">налог с компаний и ИП</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-[#2B2B2B] mb-2">После регистрации</h4>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">&#10003;</span>Формируйте чек на каждый доход</li>
                <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">&#10003;</span>Передавайте чек клиенту</li>
                <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">&#10003;</span>Оплачивайте налог вовремя</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <h4 className="font-semibold text-sm text-amber-800 mb-1">Ограничения НПД</h4>
              <ul className="space-y-1 text-xs text-amber-700">
                <li>Нельзя нанимать сотрудников по трудовому договору</li>
                <li>Лимит дохода — 2,4 млн &#8381;/год</li>
                <li>Нельзя совмещать с запрещённой для НПД деятельностью</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
