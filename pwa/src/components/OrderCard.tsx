import { MapPin, Clock, Users, Banknote, MessageCircle } from 'lucide-react';
import YandexButton from './YandexButton';
import type { Order } from '@/lib/types';

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Открыт' },
  closed:    { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Закрыт' },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Ожидает' },
  paid:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',     label: 'Оплачен' },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500',      label: 'Отменён' },
  done:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',  label: 'Выполнен' },
};

const workTypeEmoji: Record<string, string> = {
  'грузчики': '💪',
  'уборка': '🧹',
  'стройка': '🏗',
  'разнорабочие': '🔧',
  'другое': '📋',
};

export default function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status] || statusConfig.pending;
  const emoji = workTypeEmoji[order.work_type] || '📋';
  const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
  const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';

  return (
    <article className="
      bg-white rounded-3xl shadow-card p-5 space-y-4
      border border-gray-100
      hover:shadow-card-hover hover:-translate-y-0.5
      transition-all duration-300 animate-fade-in
    ">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{emoji}</span>
          <div>
            <p className="font-bold text-gray-900">Заказ #{order.order_id}</p>
            <p className="text-xs text-gray-400 capitalize">{order.work_type}</p>
          </div>
        </div>
        <span className={`
          inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold
          ${status.bg} ${status.text}
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-start gap-2.5 text-sm text-gray-600">
          <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <span className="font-medium text-gray-800">{order.address}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
          {order.time && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" />
              {order.time}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} className="text-gray-400" />
            {order.people} чел. × {order.hours} ч.
          </span>
          {order.worker_payout != null ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
              <Banknote size={14} />
              {order.worker_payout.toLocaleString('ru-RU')}₽ на руки
            </span>
          ) : order.payment_text ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700">
              <Banknote size={14} className="text-gray-400" />
              {order.payment_text}
            </span>
          ) : null}
        </div>

        {order.comment && (
          <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            <MessageCircle size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <span className="italic">{order.comment}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <div className="flex gap-2">
          <div className="flex-1">
            <YandexButton lat={order.lat} lon={order.lon} address={order.address} />
          </div>
        </div>

        {order.status === 'published' && (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://t.me/${botName}?start=order_${order.order_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center justify-center gap-1.5
                bg-brand-500 text-white
                py-2.5 rounded-2xl font-semibold text-sm
                hover:bg-brand-600 active:scale-[0.97]
                transition-all duration-200 shadow-sm
              "
            >
              📱 Telegram
            </a>
            <a
              href={maxChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center justify-center gap-1.5
                bg-max text-white
                py-2.5 rounded-2xl font-semibold text-sm
                hover:bg-max-dark active:scale-[0.97]
                transition-all duration-200 shadow-sm
              "
            >
              💬 MAX
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
