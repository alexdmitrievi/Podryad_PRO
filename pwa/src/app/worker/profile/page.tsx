'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const PAYOUT_WIDGET_KEY = process.env.NEXT_PUBLIC_YUKASSA_PAYOUT_WIDGET_KEY;

interface WorkerProfile {
  name?: string;
  phone?: string;
  payout_card?: string;         // last 4 digits stored in DB
  payout_card_synonym?: string; // full synonym (not exposed publicly)
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-5 w-5 text-emerald-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="h-5 w-5 text-amber-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      className="h-6 w-6 text-[#2d35a8]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function WorkerProfilePage() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [cardBound, setCardBound] = useState(false);
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // Load worker profile to determine current card binding status
  useEffect(() => {
    fetch('/api/workers/profile')
      .then((res) => {
        if (res.ok) return res.json() as Promise<WorkerProfile>;
        return null;
      })
      .then((data) => {
        if (data) {
          setProfile(data);
          if (data.payout_card) {
            setCardBound(true);
            setCardLast4(data.payout_card);
          }
        }
        setProfileLoading(false);
      })
      .catch(() => {
        setProfileLoading(false);
      });
  }, []);

  async function saveCardSynonym(cardSynonym: string, panFragment: string) {
    setSaveError(null);
    const last4 = panFragment.replace(/\D/g, '').slice(-4) || panFragment.slice(-4);

    try {
      const res = await fetch('/api/workers/update-payout-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_synonym: cardSynonym, card_last4: last4 }),
      });

      if (res.ok) {
        setCardLast4(last4);
        setCardBound(true);
        setWidgetVisible(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const errData = (await res.json()) as { error?: string };
        setSaveError(errData.error ?? 'Не удалось сохранить карту');
      }
    } catch {
      setSaveError('Ошибка соединения при сохранении карты');
    }
  }

  function loadWidget() {
    if (!PAYOUT_WIDGET_KEY) return;
    setWidgetLoading(true);
    setWidgetVisible(true);
    setSaveError(null);

    // Load YooKassa Payout Widget script dynamically
    const existingScript = document.getElementById('yukassa-payout-widget');
    if (existingScript) {
      initWidget();
      return;
    }

    const script = document.createElement('script');
    script.id = 'yukassa-payout-widget';
    script.src = 'https://yookassa.ru/integration/simplepay/button';
    script.async = true;
    script.onload = () => {
      initWidget();
    };
    script.onerror = () => {
      setWidgetLoading(false);
      setSaveError('Не удалось загрузить виджет привязки карты');
    };
    document.head.appendChild(script);
  }

  function initWidget() {
    try {
      // YooKassa Payout Widget initialization
      // See: https://yookassa.ru/developers/payouts/widget
      const widget = new (window as unknown as { YooMoneyCheckoutWidget: new (cfg: unknown) => { render: (id: string) => void } }).YooMoneyCheckoutWidget({
        clientApplicationKey: PAYOUT_WIDGET_KEY,
        returnUrl: window.location.href,
        // Success callback: widget calls this when card is tokenized
        onSuccess: (result: { card_synonym: string; panFragment: string }) => {
          saveCardSynonym(result.card_synonym, result.panFragment);
        },
        onError: (error: unknown) => {
          console.error('YooKassa Payout Widget error:', error);
          setSaveError('Ошибка виджета. Попробуйте снова.');
        },
      });
      widget.render('payout-widget-container');
      setWidgetLoading(false);
    } catch (err) {
      console.error('Failed to initialize YooKassa Payout Widget:', err);
      setWidgetLoading(false);
      setSaveError('Не удалось инициализировать виджет привязки карты');
    }
  }

  const widgetAvailable = !!PAYOUT_WIDGET_KEY;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-4">
          <Link
            href="/worker"
            className="text-[#2d35a8] hover:underline text-sm cursor-pointer"
          >
            ← Назад
          </Link>
          <h1 className="text-2xl font-bold text-[#1a1f5c]">Профиль исполнителя</h1>
        </div>

        {/* Worker info card */}
        {profileLoading ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        ) : profile ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            {profile.name && (
              <p className="font-semibold text-[#1a1f5c] text-lg">{profile.name}</p>
            )}
            {profile.phone && (
              <p className="text-gray-500 text-sm mt-1">+{profile.phone}</p>
            )}
          </div>
        ) : null}

        {/* Payout card section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CardIcon />
            <h2 className="text-lg font-bold text-[#1a1f5c]">Карта для выплат</h2>
          </div>

          {/* Card binding status */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-gray-50">
            {cardBound ? <CheckCircleIcon /> : <WarningIcon />}
            <span className="text-sm font-medium text-gray-700">
              {cardBound && cardLast4
                ? `Карта привязана: ****\u00a0${cardLast4}`
                : 'Карта не привязана'}
            </span>
          </div>

          {/* Save success banner */}
          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircleIcon />
              Карта успешно привязана!
            </div>
          )}

          {/* Error banner */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {saveError}
            </div>
          )}

          {/* Widget unavailable fallback */}
          {!widgetAvailable && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
              Привязка карты временно недоступна. Обратитесь в поддержку.
            </div>
          )}

          {/* Bind / Change card button */}
          {widgetAvailable && !widgetVisible && (
            <button
              onClick={loadWidget}
              className="w-full flex items-center justify-center gap-2 bg-[#2d35a8] text-white rounded-lg py-3 px-6 font-semibold hover:bg-[#1a1f5c] transition-colors duration-200 cursor-pointer"
            >
              {cardBound ? 'Изменить карту' : 'Привязать карту'}
            </button>
          )}

          {/* Widget container (rendered here by YooKassa script) */}
          {widgetVisible && (
            <div className="mt-4">
              {widgetLoading && (
                <div className="flex items-center justify-center gap-3 py-6 text-gray-500">
                  <SpinnerIcon />
                  <span className="text-sm">Загрузка виджета...</span>
                </div>
              )}
              <div
                id="payout-widget-container"
                ref={widgetContainerRef}
                className="min-h-[100px]"
              />
              <button
                onClick={() => {
                  setWidgetVisible(false);
                  setSaveError(null);
                }}
                className="mt-3 w-full text-gray-400 text-sm hover:text-gray-600 cursor-pointer"
              >
                Отмена
              </button>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            Карта используется для автоматических выплат после подтверждения выполнения заказа.
            Данные карты обрабатываются сервисом ЮKassa (PCI DSS).
          </p>
        </div>
      </div>
    </div>
  );
}
