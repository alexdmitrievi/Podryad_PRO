'use client';

import { useEffect, useState } from 'react';
import { X, Phone, Building2, User, LogIn } from 'lucide-react';
import Link from 'next/link';
import type { Listing } from './ListingCard';

type Contact = {
  company_name: string;
  contact_name: string;
  phone: string;
};

type Props = {
  listing: Listing | null;
  isLoggedIn: boolean;
  onClose: () => void;
};

export default function ContactModal({ listing, isLoggedIn, onClose }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listing || !isLoggedIn) return;
    let cancelled = false;

    async function load() {
      setContact(null);
      setError(null);
      setLoading(true);
      try {
        const r = await fetch('/api/marketplace/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ listing_id: listing!.listing_id }),
        });
        const data: { ok?: boolean; contact?: Contact; error?: string } = await r.json();
        if (!cancelled) {
          if (data.ok && data.contact) {
            setContact(data.contact);
          } else {
            setError('Не удалось получить контакт');
          }
        }
      } catch {
        if (!cancelled) setError('Ошибка сети');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [listing, isLoggedIn]);

  if (!listing) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white dark:bg-dark-card rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-dark-border">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Контакт поставщика</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-border transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Listing title */}
          <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-400 dark:text-dark-muted mb-0.5">Предложение</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{listing.title}</p>
            <p className="text-base font-extrabold text-brand-500 mt-1">
              {listing.price.toLocaleString('ru-RU')} ₽ / {listing.category?.unit ?? listing.price_unit}
            </p>
          </div>

          {!isLoggedIn ? (
            /* Not logged in */
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <LogIn size={24} className="text-brand-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Войдите, чтобы увидеть контакт поставщика
              </p>
              <Link
                href="/auth/login"
                className="block w-full bg-brand-500 text-white font-bold py-3 rounded-2xl text-sm hover:bg-brand-600 transition-colors text-center"
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className="block w-full mt-2 text-brand-500 font-medium py-2 text-sm hover:underline text-center"
              >
                Зарегистрироваться
              </Link>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={onClose}
                className="mt-3 text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          ) : contact ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-xl">
                <div className="w-9 h-9 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-brand-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-dark-muted">Компания</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{contact.company_name}</p>
                </div>
              </div>

              {contact.contact_name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-xl">
                  <div className="w-9 h-9 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <User size={18} className="text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-dark-muted">Контактное лицо</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{contact.contact_name}</p>
                  </div>
                </div>
              )}

              {contact.phone && (
                <a
                  href={`tel:+${contact.phone}`}
                  className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
                    <Phone size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-green-600 dark:text-green-400">Позвонить</p>
                    <p className="text-sm font-bold text-green-700 dark:text-green-300">+{contact.phone}</p>
                  </div>
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
