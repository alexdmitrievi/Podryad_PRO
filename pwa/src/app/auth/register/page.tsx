'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Building2, Briefcase, FileCheck, ChevronRight } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'person', label: 'Физическое лицо', icon: User, hint: 'Частный заказчик или работник' },
  { value: 'selfemployed', label: 'Самозанятый', icon: FileCheck, hint: 'Плательщик НПД' },
  { value: 'ip', label: 'ИП', icon: Briefcase, hint: 'Индивидуальный предприниматель' },
  { value: 'company', label: 'Юридическое лицо', icon: Building2, hint: 'ООО, АО и другие' },
] as const;

type EntityType = (typeof ENTITY_TYPES)[number]['value'];

export default function AuthRegisterPage() {
  const router = useRouter();

  // Step 1: entity type, Step 2: form
  const [step, setStep] = useState<1 | 2>(1);
  const [entityType, setEntityType] = useState<EntityType>('person');
  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function selectEntity(type: EntityType) {
    setEntityType(type);
    setStep(2);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role,
          phone: phone || undefined,
          email: email || undefined,
          name,
          password,
          entity_type: entityType,
          company_name: companyName || undefined,
          inn: inn || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_phone: 'Укажите корректный телефон',
          invalid_email: 'Укажите корректный email',
          invalid_password: 'Пароль не короче 6 символов',
          invalid_name: 'Укажите имя или название',
          invalid_contact: 'Укажите телефон или email',
          user_exists: 'Пользователь с таким контактом уже зарегистрирован',
        };
        setError(msgs[data.error || ''] || 'Не удалось зарегистрироваться');
        return;
      }
      router.push(role === 'worker' ? '/auth/onboarding' : '/customer');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(false);
    }
  }

  const needsCompanyFields = entityType === 'company' || entityType === 'ip';

  const inputCls =
    'w-full rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3.5 text-sm dark:text-white outline-none ring-brand-500 focus:ring-2 transition-shadow';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border px-5 pt-10 pb-6">
        <div className="max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline mb-4"
          >
            &larr; Главная
          </Link>
        </div>
        <div className="max-w-md mx-auto flex flex-col items-center">
          <Image src="/logo.png" alt="Подряд PRO" width={44} height={44} className="rounded-xl mb-3" />
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            {step === 1 ? 'Создать аккаунт' : 'Регистрация'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
            {step === 1
              ? 'Выберите тип аккаунта'
              : `${ENTITY_TYPES.find((t) => t.value === entityType)?.label}`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 py-6">
          {/* ── Step 1: Entity type selection ── */}
          {step === 1 && (
            <div className="space-y-3">
              {ENTITY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectEntity(type.value)}
                    className="group w-full flex items-center gap-4 bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0 group-hover:bg-brand-100 dark:group-hover:bg-brand-800/30 transition-colors">
                      <Icon size={20} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
                        {type.hint}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-gray-300 dark:text-dark-muted group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </button>
                );
              })}

              <div className="pt-4 text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-brand-500 hover:underline"
                >
                  Уже есть аккаунт? Войти
                </Link>
              </div>
            </div>
          )}

          {/* ── Step 2: Registration form ── */}
          {step === 2 && (
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Back to step 1 */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-brand-500 hover:underline font-medium mb-2"
              >
                &larr; Изменить тип аккаунта
              </button>

              {/* Role toggle */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Ваша роль
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'customer', label: 'Заказчик' },
                    { value: 'worker', label: 'Исполнитель' },
                  ] as const).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all duration-200 ${
                        role === r.value
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-dark-border hover:ring-brand-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company fields for ИП / Юрлицо */}
              {needsCompanyFields && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {entityType === 'company' ? 'Название организации' : 'Название ИП'}
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputCls}
                      placeholder={entityType === 'company' ? 'ООО «Ваша компания»' : 'ИП Иванов И.И.'}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      ИНН
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={inn}
                      onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      className={inputCls}
                      placeholder={entityType === 'company' ? '10 цифр' : '12 цифр'}
                    />
                  </div>
                </>
              )}

              {/* Contact person name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {needsCompanyFields ? 'Контактное лицо' : 'Имя'}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Иван Петров"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Телефон
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="mail@example.com"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Укажите телефон, email или оба
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Минимум 6 символов"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-2xl bg-brand-500 py-4 text-sm font-bold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 shadow-sm"
              >
                {pending ? 'Регистрация...' : 'Создать аккаунт'}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-dark-muted">
                Уже есть аккаунт?{' '}
                <Link href="/auth/login" className="font-medium text-brand-500 hover:underline">
                  Войти
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
