import YandexButton from './YandexButton';
import type { Order } from '@/lib/types';

const statusConfig: Record<string, { class: string; label: string }> = {
  published: { class: 'bg-green-100 text-green-700', label: '🟢 Открыт' },
  closed: { class: 'bg-gray-100 text-gray-500', label: '🔒 Закрыт' },
  pending: { class: 'bg-yellow-100 text-yellow-700', label: '⏳ Ожидает' },
  paid: { class: 'bg-blue-100 text-blue-700', label: '💳 Оплачен' },
  cancelled: { class: 'bg-red-100 text-red-600', label: '❌ Отменён' },
  done: { class: 'bg-green-100 text-green-700', label: '✅ Выполнен' },
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

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3 border border-gray-100
                    hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start">
        <span className="font-bold text-lg text-gray-900">
          🧾 Заказ #{order.order_id}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.class}`}>
          {status.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm text-gray-600">
        <p className="font-medium text-gray-800">📍 {order.address}</p>
        {order.time && <p>⏰ {order.time}</p>}
        {order.worker_rate != null ? (
          <p>💰 {order.worker_rate}₽/час — на руки: {order.worker_payout?.toLocaleString() ?? '?'}₽</p>
        ) : order.payment_text ? (
          <p>💰 {order.payment_text}</p>
        ) : null}
        <p>
          👥 {order.people} чел. × {order.hours} ч.
        </p>
        <p>{emoji} {order.work_type}</p>
        {order.comment && (
          <p className="text-gray-500 italic">💬 {order.comment}</p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <YandexButton lat={order.lat} lon={order.lon} address={order.address} />

        {order.status === 'published' && (
          <a
            href={`https://t.me/${botName}?start=order_${order.order_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-[#0088cc] text-white
                       py-2.5 rounded-xl font-medium text-sm
                       hover:bg-[#0077b3] active:scale-[0.98]
                       transition-all shadow-sm"
          >
            Взять заказ 👍
          </a>
        )}
      </div>
    </div>
  );
}
