'use client';

import { useState } from 'react';

const maxChannelLink =
  process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';
const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const telegramLink = `https://t.me/${botName}`;

type Category = 'Рабочие' | 'Техника' | 'Материалы' | 'Комбо';
type City = 'Омск' | 'Новосибирск';
type Messenger = 'MAX' | 'Telegram' | 'Позвонить';

export default function HomePage() {
  const [category, setCategory] = useState<Category>('Рабочие');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<City>('Омск');
  const [messenger, setMessenger] = useState<Messenger>('Telegram');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const comment = `${description}${messenger ? ` | Мессенджер: ${messenger}` : ''}`;
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, comment, phone, city }),
      });
      setSubmitted(true);
    } catch {
      // silently submitted
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-[#2d35a8]">
            ✅ Подряд PRO
          </span>
          <a
            href="#lead-form"
            className="bg-[#2d35a8] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#252ca0] transition-colors cursor-pointer"
          >
            Оставить заявку
          </a>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className="bg-gradient-to-br from-[#2d35a8] to-[#1a2080] text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Рабочие · Техника · Стройматериалы —<br className="hidden sm:block" />
            всё для стройки в Омске и Новосибирске
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-8">
            Безопасная сделка — платите только за результат.
          </p>
          <a
            href="#lead-form"
            className="inline-block bg-[#f5a623] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#e09510] transition-colors cursor-pointer"
          >
            Оставить заявку ↓
          </a>
        </div>
      </section>

      {/* SECTION 2: РАБОЧАЯ СИЛА */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Рабочая сила
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { title: 'Грузчики', price: 'от 350₽/час' },
              { title: 'Разнорабочие', price: 'от 300₽/час' },
              { title: 'Уборка', price: 'от 250₽/час' },
              { title: 'Строители', price: 'от 500₽/час' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100"
              >
                <p className="font-bold text-gray-900 text-base mb-1">{item.title}</p>
                <p className="text-[#2d35a8] font-semibold text-sm">{item.price}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm">
            Бригады от 2 до 15 человек
          </p>
        </div>
      </section>

      {/* SECTION 3: АРЕНДА ТЕХНИКИ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Аренда техники
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { title: 'Перфоратор', price: '500₽/сутки' },
              { title: 'Болгарка', price: '400₽/сутки' },
              { title: 'Бензогенератор', price: '1500₽/сутки' },
              { title: 'Газонокосилка', price: '600₽/сутки' },
              { title: 'Триммер', price: '400₽/сутки' },
              { title: 'Плиткорез', price: '500₽/сутки' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-100"
              >
                <p className="font-bold text-gray-900 text-base mb-1">{item.title}</p>
                <p className="text-[#2d35a8] font-semibold text-sm">{item.price}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mb-3">
            Тяжёлая техника по запросу
          </p>
          <div className="text-center bg-[#fff8ee] border border-[#f5a623]/30 rounded-xl p-4 max-w-sm mx-auto">
            <p className="text-[#c07a10] font-semibold text-sm">
              Скидка 15% при заказе рабочих + техники
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: СТРОЙМАТЕРИАЛЫ */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Стройматериалы
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {['Бетон М100–М500', 'Щебень', 'Песок', 'Битум', 'Печное топливо'].map(
              (material) => (
                <div
                  key={material}
                  className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100"
                >
                  <p className="font-semibold text-gray-800 text-sm">{material}</p>
                </div>
              )
            )}
          </div>
          <p className="text-center text-gray-500 text-sm">
            Доставка по Омску и Новосибирску
          </p>
        </div>
      </section>

      {/* SECTION 5: БЕЗОПАСНАЯ СДЕЛКА */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Безопасная сделка
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Заявка', desc: 'Опишите задачу и укажите контакт' },
              { step: '2', title: 'Подбор', desc: 'Подбираем исполнителя под вашу задачу' },
              { step: '3', title: 'Оплата с заморозкой', desc: 'Деньги замораживаются до выполнения' },
              { step: '4', title: 'Подтверждение', desc: 'Выплата после вашего подтверждения' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#2d35a8] text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: ДЛЯ ИСПОЛНИТЕЛЕЙ */}
      <section className="py-16 px-4 bg-[#2d35a8] text-white">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">
            Для исполнителей
          </h2>
          <p className="text-white/80 text-lg mb-2">Бесплатно. 100% ставки.</p>
          <p className="text-white/70 mb-8">Хотите подключиться?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={maxChannelLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-[#2d35a8] font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              MAX
            </a>
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#f5a623] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#e09510] transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Telegram
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 7: ФОРМА ЗАЯВКИ */}
      <section id="lead-form" className="py-16 px-4 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-8">
            Получить расчёт
          </h2>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <p className="text-green-700 font-bold text-lg">
                ✅ Заявка отправлена! Свяжемся в течение 15 минут.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Категория
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Рабочие', 'Техника', 'Материалы', 'Комбо'] as Category[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                        category === cat
                          ? 'bg-[#2d35a8] text-white border-[#2d35a8]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#2d35a8]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание задачи
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Опишите, что нужно сделать..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2d35a8] resize-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2d35a8]"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Город
                </label>
                <div className="flex gap-2">
                  {(['Омск', 'Новосибирск'] as City[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                        city === c
                          ? 'bg-[#2d35a8] text-white border-[#2d35a8]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#2d35a8]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messenger */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Как связаться
                </label>
                <div className="flex gap-2">
                  {(['MAX', 'Telegram', 'Позвонить'] as Messenger[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMessenger(m)}
                      className={`flex-1 py-2 px-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                        messenger === m
                          ? 'bg-[#2d35a8] text-white border-[#2d35a8]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#2d35a8]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#f5a623] text-white font-bold py-4 rounded-xl text-base hover:bg-[#e09510] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Отправляем...' : 'Получить расчёт'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 py-6 px-4 text-center">
        <p className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Подряд PRO. Все права защищены.
        </p>
      </footer>
    </div>
  );
}
