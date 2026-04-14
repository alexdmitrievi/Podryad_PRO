'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PhoneInput, { isValidPhone, getRawPhone } from '@/components/ui/PhoneInput';
import { showToast } from '@/components/ui/Toast';
import { User, Building2, Phone, Lock, ChevronRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'info' | 'password'>('info');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState<'personal' | 'business'>('personal');
  const [orgName, setOrgName] = useState('');
  const [inn, setInn] = useState('');
  const [city, setCity] = useState('omsk');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  function handleInfoNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { showToast('Введите имя', 'error'); return; }
    if (!isValidPhone(phone)) { showToast('Введите корректный номер телефона', 'error'); return; }
    if (customerType === 'business' && !orgName.trim()) { showToast('Введите название организации', 'error'); return; }
    setStep('password');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { showToast('Пароль минимум 8 символов', 'error'); return; }
    if (!/[A-ZА-Я]/.test(password) || !/[0-9]/.test(password)) { showToast('Пароль должен содержать заглавную букву и цифру', 'error'); return; }
    if (password !== passwordConfirm) { showToast('Пароли не совпадают', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: getRawPhone(phone),
          name: name.trim(),
          password,
          customer_type: customerType,
          org_name: orgName.trim() || undefined,
          inn: inn.trim() || undefined,
          city,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Регистрация успешна!', 'success');
        router.push('/account');
      } else {
        showToast(data.error || 'Ошибка регистрации', 'error');
      }
    } catch {
      showToast('Ошибка соединения', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-6">
          ← Главная
        </Link>

        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-card p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#2F5BFF] flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Регистрация</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Создайте личный кабинет заказчика</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-6">
            {(['info', 'password'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === s || (s === 'info' && step === 'password') ? 'bg-[#2F5BFF] text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
                <span className={`text-xs ${step === s ? 'text-[#2F5BFF] font-medium' : 'text-gray-400'}`}>{s === 'info' ? 'Данные' : 'Пароль'}</span>
                {i === 0 && <div className="flex-1 h-px bg-gray-200" />}
              </div>
            ))}
          </div>

          {step === 'info' ? (
            <form onSubmit={handleInfoNext} className="flex flex-col gap-4">
              {/* Customer type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {([['personal', 'Частное лицо', User], ['business', 'Бизнес / ИП', Building2]] as const).map(([val, label, Icon]) => (
                  <button key={val} type="button" onClick={() => setCustomerType(val)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${customerType === val ? 'border-[#2F5BFF] bg-[#2F5BFF]/5 text-[#2F5BFF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {customerType === 'business' ? 'Контактное лицо' : 'Ваше имя'} *
                </label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов"
                  autoComplete="name" maxLength={100}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]"
                  required />
              </div>

              {customerType === 'business' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Организация / ИП *</label>
                    <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="ООО «Строймаш»" maxLength={200}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ИНН</label>
                    <input value={inn} onChange={e => setInn(e.target.value.replace(/\D/g, ''))} placeholder="7701234567" maxLength={12}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Телефон *</label>
                <PhoneInput
                  value={phone}
                  onChange={(v) => { setPhone(v); if (phoneError) setPhoneError(''); }}
                  onBlur={() => { if (phone && !isValidPhone(phone)) setPhoneError('Введите корректный номер'); else setPhoneError(''); }}
                  error={phoneError}
                  placeholder="+7 (999) 000-00-00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Город</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF] cursor-pointer">
                  <option value="omsk">Омск</option>
                  <option value="novosibirsk">Новосибирск</option>
                </select>
              </div>

              <button type="submit"
                className="w-full py-3 rounded-xl bg-[#2F5BFF] hover:bg-[#2d35a8] text-white font-semibold cursor-pointer transition-colors duration-150 flex items-center justify-center gap-2">
                Далее <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <button type="button" onClick={() => setStep('info')}
                className="text-sm text-[#2F5BFF] hover:underline text-left cursor-pointer mb-2">
                ← Изменить данные
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Пароль *
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 8 символов, заглавная + цифра"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]"
                  autoFocus required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Повторите пароль *
                </label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Повторите пароль"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]/20 focus:border-[#2F5BFF]"
                  required />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#2F5BFF] hover:bg-[#2d35a8] text-white font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2">
                {loading && <span className="btn-spinner" aria-hidden />}
                {loading ? 'Регистрация…' : 'Зарегистрироваться'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[#2F5BFF] font-semibold hover:underline">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
