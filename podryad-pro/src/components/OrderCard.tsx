import YandexButton from './YandexButton';
import type { Order } from '@/lib/sheets';

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  published: '🟢 Открыт',
  closed: '🔒 Закрыт',
  pending: '⏳ Ожидает',
  cancelled: '❌ Отменён',
};

export default function OrderCard({ order }: { order: Order }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 space-y-3 border border-gray-100">
      <div className="flex justify-between items-start">
        <span className="font-bold text-lg">🧾 Заказ #{order.order_id}</span>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500'}`}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-700">
        <p>📍 {order.address}</p>
        {order.time && <p>⏰ {order.time}</p>}
        {order.payment && <p>💰 {order.payment}</p>}
        <p>
          👥 {order.people} чел. &times; {order.hours} ч.
        </p>
        <p>📋 {order.work_type}</p>
        {order.comment && <p className="text-gray-500">💬 {order.comment}</p>}
      </div>

      <YandexButton lat={order.lat} lon={order.lon} address={order.address} />

      {order.status === 'published' && (
        <a
          href={`https://t.me/Podryad_PRO_bot?start=order_${order.order_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-brand-blue text-white py-2.5 rounded-xl font-medium hover:bg-brand-blue-dark transition-colors"
        >
          Взять заказ 👍
        </a>
      )}
    </div>
  );
}
