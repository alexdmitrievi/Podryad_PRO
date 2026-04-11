'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let _addToast: ((message: string, type: ToastType) => void) | null = null;
let _nextId = 0;

/** Call from anywhere: showToast('Ошибка сети', 'error') */
export function showToast(message: string, type: ToastType = 'info') {
  _addToast?.(message, type);
}

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

export default function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 animate-[slide-in-right_0.3s_ease] ${COLORS[toast.type]}`}
          >
            <Icon size={20} className={`flex-shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-0.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Закрыть уведомление"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
