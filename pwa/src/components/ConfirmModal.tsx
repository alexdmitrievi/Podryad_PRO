'use client';

import { useEffect, type ReactNode } from 'react';

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Закрыть"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:mx-auto sm:rounded-2xl max-h-[min(90vh,100%)] overflow-y-auto">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60 sm:w-auto sm:min-w-[140px]"
          >
            {loading && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            )}
            {confirmText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition-opacity disabled:opacity-60 sm:w-auto"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
