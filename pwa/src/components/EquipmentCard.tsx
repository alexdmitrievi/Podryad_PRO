import type { EquipmentItem } from '@/lib/equipment';
import { DELIVERY_PRICE } from '@/lib/equipment';

interface Props {
  item: EquipmentItem;
  showComboDiscount?: boolean;
}

export default function EquipmentCard({ item, showComboDiscount }: Props) {
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
  const bookUrl = `https://t.me/${botName}?start=rent_${item.id}`;

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex gap-4">
        <div className="shrink-0 w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">
          {item.image_placeholder}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <h3 className="font-bold text-gray-900 break-words flex-1 min-w-0">
              {item.name}
            </h3>
            {showComboDiscount && (
              <span className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg whitespace-nowrap">
                −15% с исполнителями
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5 break-words">
            {item.description}
          </p>
          <p className="text-xs text-gray-400 mt-1 break-words">{item.specs}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 mt-4 text-sm font-medium text-gray-800">
        <span>4 часа: {item.rate_4h.toLocaleString('ru-RU')}₽</span>
        <span>Сутки: {item.rate_day.toLocaleString('ru-RU')}₽</span>
        <span>3 дня: {item.rate_3days.toLocaleString('ru-RU')}₽</span>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Залог: {item.deposit.toLocaleString('ru-RU')}₽
      </p>

      <div className="mt-4">
        {item.available ? (
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex items-center justify-center gap-2
              bg-[#0088cc] text-white
              py-2.5 rounded-xl font-semibold text-sm
              hover:bg-[#0077b3] active:scale-[0.98]
              transition-all duration-200
            "
          >
            📱 Забронировать →
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="
              w-full py-2.5 rounded-xl font-medium text-sm
              bg-gray-100 text-gray-500 cursor-not-allowed
            "
          >
            Сейчас в аренде
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2 text-center">
        Самовывоз бесплатно · Доставка {DELIVERY_PRICE.toLocaleString('ru-RU')}₽
      </p>
    </article>
  );
}
