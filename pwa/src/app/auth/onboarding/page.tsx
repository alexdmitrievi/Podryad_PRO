'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

const SKILL_OPTIONS = [
  'грузчики',
  'уборка',
  'стройка',
  'разнорабочие',
  'другое',
] as const;

const CITY_OPTIONS = ['Омск', 'Новосибирск'] as const;

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [city, setCity] = useState<string>(CITY_OPTIONS[0]);
  const [isSelfemployed, setIsSelfemployed] = useState(false);
  const [about, setAbout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /* Проверяем авторизацию — если нет сессии, отправляем на регистрацию */
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { authenticated?: boolean }) => {
        if (!data.authenticated) {
          router.replace('/auth/register');
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        router.replace('/auth/register');
      });
  }, [router]);

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (skills.length === 0) {
      setError('Выберите хотя бы один навык');
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/workers/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          skills: skills.join(', '),
          city,
          is_selfemployed: isSelfemployed,
          about: about.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || 'Не удалось сохранить профиль');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PageHeader
        title="Заполните профиль"
        subtitle="Расскажите о себе — это поможет находить заказы"
        backHref="/auth/register"
        backLabel="← Назад"
      />

      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-md space-y-6 p-4 pb-10"
      >
        {/* ── Навыки ── */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">
            Навыки
          </legend>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => {
              const active = skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'bg-white text-gray-700 ring-1 ring-gray-200'
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── Город ── */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Город
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500 focus:ring-2"
          >
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ── Самозанятость ── */}
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200">
          <span className="text-sm text-gray-700">Я самозанятый</span>
          <button
            type="button"
            role="switch"
            aria-checked={isSelfemployed}
            onClick={() => setIsSelfemployed((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              isSelfemployed ? 'bg-brand-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                isSelfemployed ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* ── О себе ── */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            О себе
          </label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value.slice(0, 300))}
            maxLength={300}
            rows={4}
            placeholder="Кратко опишите свой опыт..."
            className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500 focus:ring-2"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {about.length}/300
          </p>
        </div>

        {/* ── Ошибка ── */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* ── Кнопка ── */}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {pending ? 'Сохранение...' : 'Сохранить и продолжить'}
        </button>
      </form>
    </div>
  );
}
