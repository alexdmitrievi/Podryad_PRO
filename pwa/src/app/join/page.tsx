'use client';

import { useState } from 'react';
import Link from 'next/link';
import PhoneInput, { isValidPhone, getRawPhone } from '@/components/ui/PhoneInput';
import { showToast } from '@/components/ui/Toast';

type FormType = 'solo' | 'brigade';
type City = 'omsk' | 'novosibirsk';
type ContactMethod = 'MAX' | 'Telegram' | 'Позвонить';

const CITY_LABELS: Record<City, string> = {
  omsk: 'Омск',
  novosibirsk: 'Новосибирск',
};

const SPECIALTY_OPTIONS = [
  'Грузчики',
  'Разнорабочие',
  'Строители',
  'Уборка территории',
  'Водители техники',
  'Благоустройство',
  'Сварщики',
  'Монтажники',
  'Другое',
];

const CONTACT_METHODS: { id: ContactMethod; label: string; activeClass: string }[] = [
  { id: 'MAX', label: 'MAX', activeClass: 'bg-max text-white border-max' },
  { id: 'Telegram', label: 'Telegram', activeClass: 'bg-brand-500 text-white border-brand-500' },
  { id: 'Позвонить', label: 'Позвонить', activeClass: 'bg-success-500 text-white border-success-500' },
];

export default function JoinPage() {
  const [formType, setFormType] = useState<FormType>('solo');
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
  const [phoneError, setPhoneError] = useState('');

  // Реквизиты для выплаты
  const [payoutType, setPayoutType] = useState<'sbp' | 'bank_transfer' | 'cash'>('sbp');
  const [payoutSbpPhone, setPayoutSbpPhone] = useState('');
  const [payoutBankDetails, setPayoutBankDetails] = useState('');
  const [isLegalEntity, setIsLegalEntity] = useState(false);
  const [inn, setInn] = useState('');
  const [hasTransport, setHasTransport] = useState(false);
  const [hasTools, setHasTools] = useState(false);

  function toggleSpecialty(spec: string) {
    setSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    if (!name.trim()) {
      showToast('Укажите имя', 'error');
      return;
    }
    if (!isValidPhone(phone)) {
      showToast('Введите корректный номер телефона', 'error');
      return;
    }
    if (specialties.length === 0) {
      showToast('Выберите хотя бы одну специализацию', 'error');
      return;
    }
    if (formType === 'brigade' && (!crewSize || parseInt(crewSize, 10) < 2)) {
      showToast('Укажите количество человек в бригаде (от 2)', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: getRawPhone(phone),
          city,
          specialties,
          experience,
          preferred_contact: preferredContact,
          about,
          is_brigade: formType === 'brigade',
          crew_size: formType === 'brigade' && crewSize ? parseInt(crewSize, 10) : undefined,
          has_transport: formType === 'brigade' ? hasTransport : undefined,
          has_tools: formType === 'brigade' ? hasTools : undefined,
          payout_type: payoutType,
          payout_sbp_phone: payoutType === 'sbp' ? (payoutSbpPhone.trim() || getRawPhone(phone)) : undefined,
          payout_bank_details: payoutType === 'bank_transfer' ? payoutBankDetails.trim() : undefined,
          is_legal_entity: isLegalEntity,
          inn: inn.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сервера');
      setSubmitted(true);
    } catch {
      showToast('Не удалось отправить анкету. Попробуйте ещё раз.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Header */}
      <div className="section-gradient py-10 sm:py-14 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors cursor-pointer mb-4"
          >
            ← Главная
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading mb-3 text-center">
            Стать исполнителем
          </h1>
          <p className="text-white/75 text-base sm:text-lg text-center">
            Платформа бесплатна. Получайте заказы без комиссий.
          </p>

          {/* Form type toggle */}
          <div className="grid grid-cols-2 gap-2 mt-6">
            <button
              type="button"
              onClick={() => setFormType('solo')}
              className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                formType === 'solo'
                  ? 'bg-white text-brand-900 border-white shadow-glow'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              Я один
            </button>
            <button
              type="button"
              onClick={() => setFormType('brigade')}
              className={`min-h-[48px] py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                formType === 'brigade'
                  ? 'bg-white text-brand-900 border-white shadow-glow'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              У меня бригада
            </button>
          </div>
        </div>
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
            <p className="text-green-600 text-sm mb-6">Мы свяжемся с вами в ближайшее время.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors min-h-[48px] cursor-pointer"
            >
              На главную
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 sm:p-8 shadow-elevated border border-gray-100/80 space-y-6"
          >
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {formType === 'brigade' ? 'Имя бригадира' : 'Имя'} <span className="text-red-500">*</span>
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
              <PhoneInput
                value={phone}
                onChange={setPhone}
                required
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

            {/* Brigade-specific fields */}
            {formType === 'brigade' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Количество человек в бригаде <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={crewSize}
                    onChange={(e) => setCrewSize(e.target.value)}
                    placeholder="Например: 5"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasTransport}
                      onChange={(e) => setHasTransport(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Есть свой транспорт</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasTools}
                      onChange={(e) => setHasTools(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Есть свой инструмент</span>
                  </label>
                </div>
              </>
            )}

            {/* About */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">О себе</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={3}
                placeholder={
                  formType === 'brigade'
                    ? 'Расскажите о бригаде, опыте и выполненных объектах...'
                    : 'Расскажите о себе, своём оборудовании или команде...'
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow"
              />
            </div>

            {/* Payout requisites */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Как удобно получать оплату?</label>
              <div className="grid grid-cols-3 gap-2">
                {(['sbp', 'bank_transfer', 'cash'] as const).map((type) => {
                  const labels = { sbp: 'СБП', bank_transfer: 'Перевод', cash: 'Наличные' };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPayoutType(type)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        payoutType === type
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
              {payoutType === 'sbp' && (
                <input
                  type="tel"
                  value={payoutSbpPhone}
                  onChange={(e) => setPayoutSbpPhone(e.target.value)}
                  placeholder="Телефон для СБП (если отличается от основного)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              )}
              {payoutType === 'bank_transfer' && (
                <textarea
                  value={payoutBankDetails}
                  onChange={(e) => setPayoutBankDetails(e.target.value)}
                  placeholder="Банк, расчётный счёт, БИК, ИНН получателя"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              )}
              <input
                type="text"
                value={inn}
                onChange={(e) => setInn(e.target.value)}
                placeholder="ИНН (если есть, необязательно)"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLegalEntity}
                  onChange={(e) => setIsLegalEntity(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">Я ИП или организация</span>
              </label>
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
