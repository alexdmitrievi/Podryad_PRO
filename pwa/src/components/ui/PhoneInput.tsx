'use client';

import { useCallback } from 'react';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Remove leading 8 or 7, normalize to just digits after country code
  let d = digits;
  if (d.startsWith('8') && d.length > 1) d = '7' + d.slice(1);
  if (d.startsWith('7')) d = d.slice(1);
  if (d.length === 0) return '+7 ';
  if (d.length <= 3) return `+7 (${d}`;
  if (d.length <= 6) return `+7 (${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 8) return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}

export function getRawPhone(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length > 1) return '7' + digits.slice(1);
  return digits;
}

export function isValidPhone(formatted: string): boolean {
  return getRawPhone(formatted).length === 11;
}

interface PhoneInputProps {
  value: string;
  onChange: (formatted: string) => void;
  onBlur?: () => void;
  className?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
}

export default function PhoneInput({ value, onChange, onBlur, className, required, error, placeholder }: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      onChange(formatted);
    },
    [onChange],
  );

  const handleFocus = useCallback(
    () => {
      if (!value) onChange('+7 ');
    },
    [value, onChange],
  );

  const borderClass = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
    : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/20';

  const errorId = error ? 'phone-input-error' : undefined;

  return (
    <div>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={onBlur}
        placeholder={placeholder ?? "+7 (___) ___-__-__"}
        required={required}
        maxLength={18}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full border rounded-xl px-4 py-3 min-h-[48px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-shadow ${borderClass} ${className ?? ''}`}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
