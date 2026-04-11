'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Wrench, Package, Layers, Zap } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import PhoneInput, { isValidPhone, getRawPhone } from '@/components/ui/PhoneInput';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type WorkType = 'labor' | 'equipment' | 'materials' | 'combo' | '';
type City = 'omsk' | 'novosibirsk';
type Messenger = 'MAX' | 'Telegram' | 'Позвонить';

const SUBCATEGORIES: Record<string, string[]> = {
  labor: ['Грузчики', 'Разнорабочие', 'Строители', 'Уборка территории', 'Благоустройство', 'Другое'],
  equipment: ['Экскаватор', 'Бульдозер', 'Самосвал', 'Погрузчик', 'Виброплита', 'Другое'],
  materials: ['Бетон', 'Щебень', 'Песок', 'Битум', 'Другое'],
  combo: [],
};

const COMBO_COMPONENTS = [
  { key: 'labor', label: 'Рабочие / Бригада', icon: <Users size={16} /> },
  { key: 'equipment', label: 'Техника / Спецтехника', icon: <Wrench size={16} /> },
  { key: 'materials', label: 'Материалы', icon: <Package size={16} /> },
];

function getComboDiscountLabel(components: string[]): string | null {
  const has = (k: string) => components.includes(k);
  if (has('labor') && has('equipment') && has('materials')) return '−20%';
  if (has('labor') && has('equipment')) return '−15%';
  if (has('labor') && has('materials')) return '−10%';
  if (has('equipment') && has('materials')) return '−10%';
  return null;
}

const CATEGORY_OPTIONS: {
  value: WorkType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  { value: 'labor', label: 'Рабочие', icon: <Users size={22} /> },
  { value: 'equipment', label: 'Техника', icon: <Wrench size={22} /> },
  { value: 'materials', label: 'Материалы', icon: <Package size={22} /> },
  { value: 'combo', label: 'Комбо', icon: <Zap size={22} />, badge: 'до −20%' },
];

const CITY_OPTIONS: { value: City; label: string }[] = [
  { value: 'omsk', label: 'Омск' },
  { value: 'novosibirsk', label: 'Новосибирск' },
];

const MESSENGER_OPTIONS: Messenger[] = ['MAX', 'Telegram', 'Позвонить'];

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const chipBase =
  'py-2.5 px-4 text-sm font-semibold rounded-xl border-[1.5px] transition-all duration-200 cursor-pointer';
const chipActive = 'bg-brand-500 text-white border-brand-500 shadow-glow';
const chipInactive =
  'bg-white text-gray-700 border-gray-200 hover:border-brand-400 hover:shadow-sm';

const inputClass = 'input-field';

export default function OrderNewPage() {
  const [work_type, setWorkType] = useState<WorkType>('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [address_lat, setAddressLat] = useState<number | undefined>(undefined);
  const [address_lng, setAddressLng] = useState<number | undefined>(undefined);
  const [work_date, setWorkDate] = useState('');
  const [people_count, setPeopleCount] = useState(1);
  const [hours, setHours] = useState('');
  const [city, setCity] = useState<City>('omsk');
  const [phone, setPhone] = useState('');
  const [customer_name, setCustomerName] = useState('');
  const [messenger, setMessenger] = useState<Messenger>('MAX');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [comboComponents, setComboComponents] = useState<string[]>([]);

  function toggleComboComponent(key: string) {
    setComboComponents(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function handleMapSelect(lat: number, lng: number) {
    setAddressLat(lat);
    setAddressLng(lng);
  }

  function changePeopleCount(delta: number) {
    setPeopleCount((prev) => Math.min(50, Math.max(1, prev + delta)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !phone) return;
    if (!isValidPhone(phone)) {
      showToast('Введите корректный номер телефона', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_type,
          subcategory,
          description,
          address,
          address_lat,
          address_lng,
          work_date,
          people_count,
          hours: hours ? Number(hours) : undefined,
          city,
          phone: getRawPhone(phone),
          customer_name,
          messenger,
          combo_components: work_type === 'combo' ? comboComponents : undefined,
        }),
      });
      if (!res.ok) throw new Error('API error');
      setSubmitted(true);
    } catch {
      showToast('Ошибка при отправке заявки. Попробуйте ещё раз.', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface font-sans">
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Подряд PRO" width={36} height={36} className="rounded-lg" />
              <span className="text-lg font-extrabold text-brand-900 font-heading">Подряд PRO</span>
            </div>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-brand-500 transition-colors font-semibold cursor-pointer"
            >
              ← На главную
            </Link>
          </div>
        </nav>
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-success-50 border border-green-200 rounded-xl p-10 text-center shadow-elevated relative overflow-hidden">
            <div className="confetti-container">
              {[...Array(8)].map((_, i) => <span key={i} className="confetti-dot" />)}
            </div>
            <div className="success-icon mx-auto mb-6">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600 success-check">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-700 font-bold text-xl mb-2 font-heading">Заказ создан!</p>
            <p className="text-green-600 text-sm leading-relaxed">
              Мы свяжемся с вами для уточнения деталей.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Подряд PRO" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-extrabold text-brand-900 font-heading">Подряд PRO</span>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-brand-500 transition-colors font-semibold cursor-pointer"
          >
            ← На главную
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-lg mx-auto px-4 py-10 pb-32 md:pb-10">
        <div className="text-center mb-8">
          <span className="inline-block text-brand-500 font-semibold text-sm tracking-wider uppercase mb-3">
            Новый заказ
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
            Разместить заказ
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Заполните форму — мы подберём исполнителя и свяжемся за 15 минут
          </p>
        </div>

        <form
          id="order-form"
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 sm:p-8 shadow-elevated border border-gray-100 space-y-6"
        >
          {/* 1. Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Категория
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORY_OPTIONS.map(({ value, label, icon, badge }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setWorkType(value);
                    setSubcategory('');
                    if (value !== 'combo') setComboComponents([]);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 min-h-[80px] rounded-xl border transition-all duration-200 cursor-pointer font-semibold text-sm relative ${
                    work_type === value ? chipActive : chipInactive
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      {badge}
                    </span>
                  )}
                  <span className={work_type === value ? 'text-white' : 'text-brand-500'}>
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Subcategory / Combo components */}
          {work_type === 'combo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Что включить в комбо?
                </label>
                <div className="grid gap-2">
                  {COMBO_COMPONENTS.map(({ key, label, icon }) => (
                    <button key={key} type="button"
                      onClick={() => toggleComboComponent(key)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                        comboComponents.includes(key) ? chipActive : chipInactive
                      }`}>
                      <span className={comboComponents.includes(key) ? 'text-white' : 'text-brand-500'}>{icon}</span>
                      <span className="font-semibold text-sm">{label}</span>
                    </button>
                  ))}
                </div>
                {getComboDiscountLabel(comboComponents) && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-sm px-4 py-2 rounded-xl">
                    <Zap size={16} />
                    Комбо-скидка {getComboDiscountLabel(comboComponents)}
                  </div>
                )}
              </div>
              {/* Show subcategories for each selected combo component */}
              {comboComponents.map(comp => (
                SUBCATEGORIES[comp]?.length > 0 && (
                  <div key={comp}>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      {COMBO_COMPONENTS.find(c => c.key === comp)?.label}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SUBCATEGORIES[comp].map(sub => (
                        <button key={sub} type="button"
                          onClick={() => setSubcategory(prev => prev === sub ? '' : sub)}
                          className={`${chipBase} text-xs ${subcategory === sub ? chipActive : chipInactive}`}>
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
          {work_type && work_type !== 'combo' && SUBCATEGORIES[work_type]?.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Подкатегория
              </label>
              <div className="flex flex-wrap gap-2">
                {SUBCATEGORIES[work_type].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubcategory(sub === subcategory ? '' : sub)}
                    className={`${chipBase} ${subcategory === sub ? chipActive : chipInactive}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Описание задачи
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Что нужно сделать..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* 4. Address + Map */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Адрес объекта
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Введите адрес..."
              className={`${inputClass} mb-3`}
            />
            <MapPicker
              lat={address_lat}
              lng={address_lng}
              onSelect={handleMapSelect}
              city={city}
            />
            {address_lat && address_lng && (
              <p className="text-xs text-gray-400 mt-1.5">
                Координаты: {address_lat.toFixed(5)}, {address_lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* 5. Date + People + Hours */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дата
              </label>
              <input
                type="date"
                value={work_date}
                onChange={(e) => setWorkDate(e.target.value)}
                min={getTodayString()}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Человек
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden min-h-[48px]">
                <button
                  type="button"
                  onClick={() => changePeopleCount(-1)}
                  className="flex-none w-10 flex items-center justify-center text-gray-500 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer text-lg font-bold"
                  aria-label="Уменьшить"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-bold text-gray-900 tabular-nums">
                  {people_count}
                </span>
                <button
                  type="button"
                  onClick={() => changePeopleCount(1)}
                  className="flex-none w-10 flex items-center justify-center text-gray-500 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer text-lg font-bold"
                  aria-label="Увеличить"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Часов
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="8"
                min={1}
                className={inputClass}
              />
            </div>
          </div>

          {/* 6. City */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Город
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCity(value)}
                  className={`min-h-[48px] rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    city === value ? chipActive : chipInactive
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Phone + Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Имя
              </label>
              <input
                type="text"
                value={customer_name}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Иван"
                className={inputClass}
              />
            </div>
          </div>

          {/* 8. Messenger */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Как связаться
            </label>
            <div className="flex flex-wrap gap-2">
              {MESSENGER_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMessenger(m)}
                  className={`${chipBase} ${messenger === m ? chipActive : chipInactive}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 9. 152-ФЗ consent */}
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

          {/* 10. Submit (desktop) */}
          <button
            type="submit"
            disabled={loading || !consent || !phone}
            className="hidden md:block bg-brand-500 hover:bg-brand-600 text-white font-bold min-h-[56px] py-4 rounded-xl w-full text-base transition-all hover:shadow-glow-hover disabled:opacity-50 cursor-pointer btn-press"
          >
            {loading ? 'Отправляем...' : 'Разместить заказ'}
          </button>
        </form>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 safe-area-pb">
        <button
          type="submit"
          form="order-form"
          disabled={loading || !consent || !phone}
          className="block w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-base text-center py-3.5 rounded-xl transition-colors cursor-pointer shadow-elevated disabled:opacity-50"
        >
          {loading ? 'Отправляем...' : 'Разместить заказ'}
        </button>
      </div>
    </div>
  );
}
