'use client';

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, CheckCircle2, Loader2, AlertCircle, Send, RotateCcw, Package } from 'lucide-react';

const MATERIALS = [
  { id: 'beton', label: 'Бетон всех марок от производителя', emoji: '🏗️' },
  { id: 'bitum', label: 'Битум БНД 100/130', emoji: '🛣️' },
  { id: 'sheben', label: 'Щебень всех марок', emoji: '🪨' },
  { id: 'pesok', label: 'Песок', emoji: '🏖️' },
  { id: 'toplivo', label: 'Печное топливо темное/светлое', emoji: '🔥' },
];

export default function MaterialsForm() {
  const [form, setForm] = useState({
    phone: '',
    selectedMaterials: [] as string[],
    comment: '',
    consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggleMaterial = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedMaterials: prev.selectedMaterials.includes(id)
        ? prev.selectedMaterials.filter((m) => m !== id)
        : [...prev.selectedMaterials, id],
    }));
  };

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validatePhone(form.phone)) {
      setError('Укажите корректный номер телефона (минимум 10 цифр)');
      setLoading(false);
      return;
    }

    if (form.selectedMaterials.length === 0) {
      setError('Выберите хотя бы один материал');
      setLoading(false);
      return;
    }

    if (!form.consent) {
      setError('Необходимо согласие с политикой конфиденциальности');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone.trim(),
          materials: form.selectedMaterials,
          comment: form.comment.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({})) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      setSuccess(true);
      setForm({ phone: '', selectedMaterials: [], comment: '', consent: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-8 text-center space-y-4 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-xl">
          Заявка отправлена!
        </h3>
        <p className="text-emerald-700 dark:text-emerald-300 text-sm leading-relaxed max-w-xs mx-auto">
          Мы отправим вам каталог и расчёт сметы в Telegram в течение часа
        </p>
        <button
          onClick={() => { setSuccess(false); setError(''); }}
          className="inline-flex items-center gap-2 mt-2 bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-semibold text-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-[0.98] transition-all duration-200"
        >
          <RotateCcw size={16} />
          Отправить ещё
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Phone */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          <Phone size={15} className="text-brand-500" />
          Телефон
          <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          placeholder="+7 (999) 123-45-67"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white dark:bg-dark-card dark:border-dark-border dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-200 text-sm placeholder:text-gray-300 dark:placeholder:text-gray-500"
          required
        />
      </fieldset>

      {/* Materials */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          <Package size={15} className="text-brand-500" />
          Интересующие материалы
          <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2">
          {MATERIALS.map((material) => (
            <button
              key={material.id}
              type="button"
              onClick={() => toggleMaterial(material.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium
                transition-all duration-200 border active:scale-[0.98] text-left
                ${form.selectedMaterials.includes(material.id)
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-brand-200 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20'}
              `}
            >
              <span className="text-lg">{material.emoji}</span>
              <span className="flex-1">{material.label}</span>
              <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                ${form.selectedMaterials.includes(material.id)
                  ? 'border-white bg-white'
                  : 'border-gray-300 dark:border-gray-500'}
              `}>
                {form.selectedMaterials.includes(material.id) && (
                  <CheckCircle2 size={14} className="text-brand-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Comment */}
      <fieldset>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Комментарий
        </label>
        <textarea
          placeholder="Укажите объём, марку или другие детали..."
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white dark:bg-dark-card dark:border-dark-border dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-200 text-sm resize-none placeholder:text-gray-300 dark:placeholder:text-gray-500"
        />
      </fieldset>

      {/* Consent */}
      <fieldset className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setForm({ ...form, consent: !form.consent })}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0
            transition-colors duration-200
            ${form.consent
              ? 'bg-brand-500 border-brand-500'
              : 'bg-white dark:bg-dark-card border-gray-300 dark:border-gray-500 hover:border-brand-300'}
          `}
        >
          {form.consent && <CheckCircle2 size={14} className="text-white" />}
        </button>
        <label className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed cursor-pointer">
          <span onClick={() => setForm({ ...form, consent: !form.consent })}>
            Я согласен с{' '}
          </span>
          <Link
            href="/privacy"
            target="_blank"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            политикой конфиденциальности
          </Link>
          {' '}и обработкой персональных данных
        </label>
      </fieldset>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-2xl border border-red-100 dark:border-red-800 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 bg-brand-500 text-white font-bold py-4 rounded-2xl text-base hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Отправка...
          </>
        ) : (
          <>
            <Send size={18} />
            Получить КП и скидку
          </>
        )}
      </button>

      <p className="text-gray-400 dark:text-gray-500 text-xs text-center">
        Отправим каталог и расчёт сметы в Telegram в течение 1 часа
      </p>
    </form>
  );
}
