'use client';

const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';

export interface TelegramLinkProps {
  linked?: boolean;
  onUnlink?: () => void;
  className?: string;
}

export default function TelegramLink({
  linked = false,
  onUnlink,
  className = '',
}: TelegramLinkProps) {
  const botUrl = `https://t.me/${botName}`;

  if (linked) {
    return (
      <div
        className={`rounded-3xl bg-white p-5 shadow-card border border-gray-100 ${className}`}
      >
        <p className="text-base font-bold text-gray-900 mb-1">
          ✅ Telegram привязан
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Уведомления приходят и в браузер, и в Telegram.
        </p>
        <button
          type="button"
          disabled={!onUnlink}
          onClick={() => onUnlink?.()}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          Отвязать
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl bg-white p-5 shadow-card border border-gray-100 ${className}`}
    >
      <h3 className="text-base font-bold text-gray-900 mb-2">
        📱 Привязать Telegram (необязательно)
      </h3>

      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Уведомления будут приходить и в браузер, и в Telegram.
      </p>

      <ol className="text-sm text-gray-700 space-y-3 mb-5 list-decimal pl-5">
        <li>
          Откройте бот{' '}
          <span className="font-medium text-gray-900">@{botName}</span>
        </li>
        <li>
          Напишите команду:{' '}
          <span className="font-mono text-[13px] bg-gray-50 px-1.5 py-0.5 rounded">
            /link ВАШ_ТЕЛЕФОН
          </span>
        </li>
        <li className="text-gray-600">
          Пример:{' '}
          <span className="font-mono text-[13px]">/link +79621234567</span>
        </li>
        <li>Бот привяжет ваш Telegram к аккаунту</li>
      </ol>

      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-[0.98] shadow-sm shadow-brand-500/20"
      >
        📱 Открыть бот →
      </a>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        💡 Telegram недоступен? Не проблема — push-уведомления работают без
        него.
      </p>
    </div>
  );
}
