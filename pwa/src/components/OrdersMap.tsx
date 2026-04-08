'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';

// Custom brand-colored SVG pin (#2F5BFF) — same as MapPicker
const brandIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml,' +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#2F5BFF"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const WORK_TYPE_LABELS: Record<string, string> = {
  workers: 'Рабочие',
  equipment: 'Техника',
  materials: 'Материалы',
  combo: 'Комбо',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:       { label: 'Новый',                color: 'bg-gray-100 text-gray-600' },
  priced:        { label: 'В обработке',          color: 'bg-amber-100 text-amber-700' },
  payment_sent:  { label: 'В обработке',          color: 'bg-amber-100 text-amber-700' },
  paid:          { label: 'Оплачен',              color: 'bg-blue-100 text-blue-700' },
  in_progress:   { label: 'В работе',             color: 'bg-blue-100 text-blue-700' },
  published:     { label: 'Ищем исполнителя',     color: 'bg-green-100 text-green-700' },
};

export interface PublicOrder {
  order_id: string;
  order_number?: string;
  work_type?: string;
  subcategory?: string;
  address?: string;
  address_lat: number;
  address_lng: number;
  status: string;
  people_count?: number;
  hours?: number;
  work_date?: string;
  created_at: string;
}

interface Props {
  orders: PublicOrder[];
  city: string;
}

export default function OrdersMap({ orders, city }: Props) {
  const center: [number, number] =
    city === 'novosibirsk' ? [55.0084, 82.9357] : [54.9885, 73.3242];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: 'calc(100vh - 64px)', width: '100%' }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {orders.map((order) => {
        const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
        const workTypeLabel = order.work_type ? (WORK_TYPE_LABELS[order.work_type] ?? order.work_type) : null;

        return (
          <Marker
            key={order.order_id}
            position={[order.address_lat, order.address_lng]}
            icon={brandIcon}
          >
            <Popup>
              <div className="max-w-[250px] rounded-lg p-1">
                {/* Header */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {order.order_number ? `Заказ #${order.order_number}` : 'Заказ'}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Work type & subcategory */}
                {workTypeLabel && (
                  <p className="mb-1 text-xs font-medium text-gray-700">
                    {workTypeLabel}
                    {order.subcategory ? ` · ${order.subcategory}` : ''}
                  </p>
                )}

                {/* Address */}
                {order.address && (
                  <p className="mb-2 text-xs text-gray-500 leading-snug">
                    {order.address}
                  </p>
                )}

                {/* Work date */}
                {order.work_date && (
                  <p className="mb-1 text-xs text-gray-600">
                    Дата:{' '}
                    <span className="font-medium">
                      {new Date(order.work_date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </p>
                )}

                {/* People + hours */}
                {(order.people_count || order.hours) && (
                  <p className="mb-2 text-xs text-gray-600">
                    {order.people_count ? `${order.people_count} чел.` : ''}
                    {order.people_count && order.hours ? ' · ' : ''}
                    {order.hours ? `${order.hours} ч.` : ''}
                  </p>
                )}

                {/* CTA */}
                <Link
                  href="/order/new"
                  className="mt-1 block w-full rounded-lg bg-[#2F5BFF] py-1.5 text-center text-xs font-semibold text-white transition hover:bg-[#2548d9]"
                >
                  Разместить похожий заказ
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
