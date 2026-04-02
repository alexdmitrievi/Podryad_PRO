'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type WorkType = 'labor' | 'equipment' | 'materials' | 'complex';

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: 'labor', label: 'Рабочие' },
  { value: 'equipment', label: 'Техника' },
  { value: 'materials', label: 'Материалы' },
  { value: 'complex', label: 'Всё вместе' },
];

function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function formatPhoneDisplay(raw: string): string {
  const digits = stripPhone(raw);
  if (!digits) return '';
  // Format: +7 (9XX) XXX-XX-XX
  if (digits.startsWith('7') || digits.startsWith('8')) {
    const d = digits.slice(1);
    const p = (d + '          ').slice(0, 10);
    let out = '+7';
    if (p.slice(0, 3)) out += ` (${p.slice(0, 3)})`;
    if (p.slice(3, 6)) out += ` ${p.slice(3, 6)}`;
    if (p.slice(6, 8)) out += `-${p.slice(6, 8)}`;
    if (p.slice(8, 10)) out += `-${p.slice(8, 10)}`;
    return out.trim();
  }
  return `+${digits}`;
}

export default function LeadForm() {
  const [workType, setWorkType] = useState<WorkType>('labor');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Only update when the change makes sense (allow digits and formatting chars)
    setPhone(raw);
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const digits = stripPhone(phone);
    if (digits.length < 10) {
      setError('Введите корректный номер телефона (10+ цифр)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          work_type: workType,
          comment: comment.trim() || undefined,
          source: 'landing',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'invalid_phone') {
          setError('Введите корректный номер телефона');
        } else {
          setError('Что-то пошло не так. Попробуйте ещё раз.');
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError('Ошибка сети. Проверьте подключение и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-dark-border shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </div>
        </div>
        <p className="font-bold text-gray-900 dark:text-white text-lg leading-snug">
          Заявка отправлена!
        </p>
        <p className="text-gray-500 dark:text-dark-muted mt-2 text-sm leading-relaxed">
          Свяжемся в течение 15 минут (9:00–20:00).
          <br />
          Телефон:{' '}
          <a
            href="tel:+79136691665"
            className="text-[#2d35a8] dark:text-brand-400 font-medium hover:underline"
          >
            +7-913-669-16-65
          </a>
        </p>
      </div>
    );
  }

  return (
    <div id="lead-form" className="bg-white dark:bg-dark-card rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-dark-border shadow-sm">
      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-5">
        Оставить заявку
      </h3>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Work type chips */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">
            Что нужно?
          </p>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWorkType(opt.value)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 cursor-pointer',
                  workType === opt.value
                    ? 'bg-[#2d35a8] text-white border-[#2d35a8] shadow-sm'
                    : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-muted border-gray-200 dark:border-dark-border hover:border-[#2d35a8] hover:text-[#2d35a8] dark:hover:text-brand-400',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="lead-phone"
            className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-1"
          >
            Телефон
          </label>
          <input
            id="lead-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (999) 999-99-99"
            value={phone}
            onChange={handlePhoneChange}
            disabled={loading}
            className={[
              'w-full rounded-xl border px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-muted bg-white dark:bg-dark-bg outline-none transition-all duration-150',
              'focus:ring-2 focus:ring-[#2d35a8]/30 focus:border-[#2d35a8]',
              error
                ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
                : 'border-gray-200 dark:border-dark-border',
              loading ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          />
          {error && (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Comment (optional) */}
        <div>
          <label
            htmlFor="lead-comment"
            className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-1"
          >
            Комментарий{' '}
            <span className="text-gray-400 dark:text-dark-muted font-normal">(необязательно)</span>
          </label>
          <textarea
            id="lead-comment"
            rows={2}
            placeholder="Адрес объекта, сроки, объём работ..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            className={[
              'w-full rounded-xl border border-gray-200 dark:border-dark-border px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-muted bg-white dark:bg-dark-bg outline-none resize-none transition-all duration-150',
              'focus:ring-2 focus:ring-[#2d35a8]/30 focus:border-[#2d35a8]',
              loading ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#2d35a8] hover:bg-[#2530a0] active:scale-[0.98] text-white font-bold py-3.5 px-6 text-base transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Отправляем...' : 'Получить предложение'}
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-dark-muted">
          Нажимая «Получить предложение», вы соглашаетесь с{' '}
          <a href="/privacy" className="underline hover:text-gray-600">
            политикой конфиденциальности
          </a>
        </p>
      </form>
    </div>
  );
}
