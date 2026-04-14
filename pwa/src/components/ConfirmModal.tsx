'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmText: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  children,
  confirmText,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Track whether DOM is mounted (delayed unmount for exit animation)
  const [mounted, setMounted] = useState(open);

  // Mount immediately when open becomes true
  if (open && !mounted) {
    setMounted(true);
  }

  // Delayed unmount: wait for exit animation before removing from DOM
  useEffect(() => {
    if (!open && mounted) {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  const handleCancel = useCallback(() => {
    if (loading) return;
    onCancel();
  }, [loading, onCancel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const entering = open;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${entering ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}
        aria-label="Закрыть"
        onClick={handleCancel}
      />
      <div className={`relative z-10 w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:mx-auto sm:rounded-2xl max-h-[min(90vh,100%)] overflow-y-auto ${entering ? 'modal-card-enter' : 'modal-card-exit'}`}>
        <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-900 pr-1">
          {title}
        </h2>
        {children != null ? (
          <div className="mt-3 text-sm text-gray-600">{children}</div>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:min-w-[140px] cursor-pointer"
          >
            {loading && (
              <span className="btn-spinner" aria-hidden />
            )}
            {loading ? 'Отправка…' : confirmText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition-all active:scale-[0.98] disabled:opacity-60 sm:w-auto cursor-pointer"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
