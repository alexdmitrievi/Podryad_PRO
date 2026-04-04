'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/YandexMap'), { ssr: false });

type WorkType = 'loading' | 'labor' | 'landscaping' | 'construction' | 'demolition' | 'cleaning';
type Unit = 'hour' | 'shift' | 'day' | 'sqm' | 'unit';

interface SpecialistOption {
  value: WorkType;
  label: string;
  description: string;
  minRate: number;
}

const SPECIALISTS: SpecialistOption[] = [
  { value: 'loading', label: 'Грузчики', description: 'Погрузка, разгрузка, перенос', minRate: 350 },
  { value: 'labor', label: 'Разнорабочие', description: 'Подсобные работы, уборка', minRate: 300 },
  { value: 'landscaping', label: 'Благоустройство', description: 'Покос, планировка, мощение', minRate: 250 },
  { value: 'construction', label: 'Строители', description: 'Кладка, штукатурка, плитка', minRate: 500 },
  { value: 'demolition', label: 'Демонтаж', description: 'Снос стен, разборка конструкций', minRate: 400 },
  { value: 'cleaning', label: 'Уборка', description: 'Генеральная уборка, мойка', minRate: 250 },
];

const UNIT_LABELS: Record<Unit, string> = {
  hour: 'час',
  shift: 'смена (8ч)',
  day: 'сутки',
  sqm: 'м²',
  unit: 'шт.',
};

export default function NewOrderPage() {
  /* Form state */
  const [workType, setWorkType] = useState<WorkType>('labor');
  const [people, setPeople] = useState(2);
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState<Unit>('hour');
  const [quantity, setQuantity] = useState('');
  const [address, setAddress] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);

  const [searching, setSearching] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  /* Address search via Nominatim */
  const searchAddress = useCallback(async () => {
    if (!addressQuery.trim()) return;
    setSearching(true);
    try {
      const q = addressQuery.includes('Омск') || addressQuery.includes('Новосибирск')
        ? addressQuery
        : `Омск, ${addressQuery}`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ru&countrycodes=ru`,
        { headers: { 'User-Agent': 'PodraydPRO/1.0' } }
      );
      const data = await res.json();
      if (data[0]) {
        const foundLat = parseFloat(data[0].lat);
        const foundLon = parseFloat(data[0].lon);
        setLat(foundLat);
        setLon(foundLon);
        setAddress(data[0].display_name || addressQuery);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, [addressQuery]);

  /* Map click handler */
  const handleMapClick = useCallback(async (clickLat: number, clickLon: number) => {
    setLat(clickLat);
    setLon(clickLon);
    // Reverse geocode
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLon}&format=json&accept-language=ru`,
        { headers: { 'User-Agent': 'PodraydPRO/1.0' } }
      );
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name);
        setAddressQuery(data.display_name.split(',').slice(0, 3).join(','));
      }
    } catch {
      setAddress(`${clickLat.toFixed(5)}, ${clickLon.toFixed(5)}`);
    }
  }, []);

  /* Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !phone.trim() || !lat || !lon) return;
    setLoading(true);
    try {
      await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'labor',
          work_type: workType,
          people,
          rate: rate ? Number(rate) : SPECIALISTS.find((s) => s.value === workType)?.minRate,
          unit,
          quantity: quantity ? Number(quantity) : 1,
          address,
          lat,
          lon,
          comment,
          phone: phone.trim(),
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  const selectedSpec = SPECIALISTS.find((s) => s.value === workType);
  const rateNum = rate ? Number(rate) : selectedSpec?.minRate || 0;
  const qty = quantity ? Number(quantity) : 1;
  const total = rateNum * qty * people;

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Подряд PRO" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-extrabold text-brand-900 font-heading">Подряд PRO</span>
          </Link>
          <Link href="/" className="text-brand-500 hover:text-brand-600 font-semibold text-sm flex items-center gap-1 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            На главную
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="py-10 px-4 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading mb-2">
            Заказать рабочих
          </h1>
          <p className="text-gray-500">Заполните форму — мы подберём бригаду и свяжемся с вами</p>
        </div>
      </section>

      <section className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {submitted ? (
            <div className="bg-white rounded-2xl p-10 shadow-card border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Заказ отправлен!</h2>
              <p className="text-gray-500 mb-6">Мы подберём исполнителя и свяжемся с вами в течение 15 минут.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dashboard" className="inline-flex items-center justify-center bg-brand-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-[#4DA3FF] transition-colors">
                  Смотреть заказы на карте
                </Link>
                <Link href="/" className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">
                  На главную
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Тип специалистов */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">1. Какие специалисты нужны?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SPECIALISTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => { setWorkType(s.value); if (!rate) setRate(''); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                        workType === s.value
                          ? 'border-brand-500 bg-brand-500/5 shadow-glow'
                          : 'border-gray-200 hover:border-brand-500/50'
                      }`}
                    >
                      <span className="block text-sm font-bold text-gray-900">{s.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{s.description}</span>
                      <span className="block text-xs text-brand-500 font-semibold mt-1">от {s.minRate} ₽/ч</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Параметры */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">2. Объём работы</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Кол-во рабочих</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setPeople(Math.max(1, people - 1))}
                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer font-bold text-lg">−</button>
                      <span className="text-xl font-bold text-gray-900 w-8 text-center">{people}</span>
                      <button type="button" onClick={() => setPeople(Math.min(50, people + 1))}
                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer font-bold text-lg">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Ставка (₽/{UNIT_LABELS[unit]})
                    </label>
                    <input
                      type="number"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder={`от ${selectedSpec?.minRate}`}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Единица измерения</label>
                    <div className="flex flex-wrap gap-2">
                      {(['hour', 'shift', 'day', 'sqm', 'unit'] as Unit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            unit === u
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500'
                          }`}
                        >
                          {UNIT_LABELS[u]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Количество ({UNIT_LABELS[unit]})
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="1"
                      min={1}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                    />
                  </div>
                </div>

                {total > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-brand-500/5 border border-brand-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Ориентировочная стоимость:</span>
                      <span className="text-lg font-extrabold text-brand-500">
                        {total.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {people} чел. × {rateNum.toLocaleString('ru-RU')} ₽/{UNIT_LABELS[unit]} × {qty} {UNIT_LABELS[unit]}
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Адрес + карта */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">3. Место работы</h2>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                    placeholder="Введите адрес (например: ул. Ленина, 1)"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={searching}
                    className="px-4 py-3 bg-brand-500 hover:bg-[#4DA3FF] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {searching ? '...' : 'Найти'}
                  </button>
                </div>
                {address && (
                  <p className="text-sm text-gray-600 mb-3 flex items-start gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-brand-500 mt-0.5 flex-shrink-0" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {address}
                    {lat && lon && (
                      <a
                        href={`https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-brand-500 underline whitespace-nowrap flex-shrink-0"
                      >
                        Яндекс.Карты
                      </a>
                    )}
                  </p>
                )}
                <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '300px' }}>
                  <MapPicker
                    mode="select"
                    selectedLocation={lat && lon ? { lat, lon } : null}
                    onLocationSelect={handleMapClick}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Нажмите на карту, чтобы указать точное место, или введите адрес</p>
              </div>

              {/* 4. Комментарий + контакт */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">4. Детали и контакт</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Комментарий к заказу</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Опишите задачу подробнее: что нужно сделать, особые условия..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ваш телефон</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer" />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Я даю согласие на обработку персональных данных в соответствии с&nbsp;
                      <a href="/privacy" className="text-brand-500 underline" target="_blank">ФЗ №152</a>
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !consent || !phone.trim() || !lat || !lon}
                className="w-full bg-brand-500 hover:bg-[#4DA3FF] text-white font-bold py-4 rounded-xl text-lg transition-all hover:shadow-[0_8px_30px_rgba(47,91,255,0.35)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Отправляем...' : 'Разместить заказ'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
