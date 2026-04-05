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
];

const CONTACT_METHODS: { id: ContactMethod; label: string; activeClass: string }[] = [
  { id: 'MAX', label: 'MAX', activeClass: 'bg-[#2787F5] text-white border-[#2787F5]' },
  { id: 'Telegram', label: 'Telegram', activeClass: 'bg-[#229ED9] text-white border-[#229ED9]' },
  { id: 'Позвонить', label: 'Позвонить', activeClass: 'bg-green-500 text-white border-green-500' },
  { id: 'Email', label: 'Email', activeClass: 'bg-brand-500 text-white border-brand-500' },
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
      <div
        className="py-14 px-4 text-center"
        style={{ background: 'linear-gradient(135deg, #1E2A5A 0%, #2F5BFF 100%)' }}
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mb-3">
          Стать исполнителем
        </h1>
        <p className="text-white/75 text-base sm:text-lg">
          Платформа бесплатна. Получайте заказы без комиссий.
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-lg mx-auto px-4 py-12">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center shadow-elevated">
            <svg
              className="mx-auto mb-4 text-green-500"
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-green-700 font-bold text-xl mb-1">Анкета отправлена!</p>
            <p className="text-green-600 text-sm">Мы свяжемся с вами.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-8 sm:p-10 shadow-elevated border border-gray-100/80 space-y-6"
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
                    className={`min-h-[48px] py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 cursor-pointer ${
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
                      className={`px-4 py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 cursor-pointer min-h-[48px] ${
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
                      className={`min-h-[48px] py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 cursor-pointer ${
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
              className="bg-brand-500 hover:bg-[#4DA3FF] text-white font-bold min-h-[56px] py-4 rounded-[10px] w-full text-base transition-all hover:shadow-[0_8px_30px_rgba(47,91,255,0.35)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Отправляем...' : 'Отправить анкету'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
