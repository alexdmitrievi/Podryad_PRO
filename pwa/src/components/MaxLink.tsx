'use client';

const maxChannelLink = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryadpro';

export interface MaxLinkProps {
  linked?: boolean;
  onUnlink?: () => void;
  className?: string;
}

export default function MaxLink({
  linked = false,
  onUnlink,
  className = '',
}: MaxLinkProps) {
  if (linked) {
    return (
      <div
        className={`rounded-3xl bg-white p-5 shadow-card border border-gray-100 ${className}`}
      >
        <p className="text-base font-bold text-gray-900 mb-1">
          ✅ MAX привязан
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Уведомления приходят и в браузер, и в MAX.
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
        💬 Привязать MAX (необязательно)
      </h3>

      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Уведомления будут приходить и в браузер, и в MAX — наш основной мессенджер.
      </p>

      <ol className="text-sm text-gray-700 space-y-3 mb-5 list-decimal pl-5">
        <li>
          Откройте канал{' '}
          <span className="font-medium text-gray-900">Подряд PRO</span> в MAX
        </li>
        <li>
          Напишите команду:{' '}
          <span className="font-mono text-[13px] bg-gray-50 px-1.5 py-0.5 rounded">
            /link ВАШ_ТЕЛЕФОН
          </span>
        </li>
        <li className="text-gray-600">
          Пример:{' '}
          <span className="font-mono text-[13px]">/link 89621234567</span>
        </li>
        <li>Бот привяжет ваш MAX к аккаунту</li>
      </ol>

      <a
        href={maxChannelLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm bg-[#2787F5] text-white transition-all hover:bg-[#1b6fd4] active:scale-[0.98] shadow-sm shadow-[#2787F5]/20"
      >
        💬 Открыть MAX →
      </a>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        💡 MAX — основной мессенджер Подряд PRO. Все уведомления приходят сюда в первую очередь.
      </p>
    </div>
  );
}
