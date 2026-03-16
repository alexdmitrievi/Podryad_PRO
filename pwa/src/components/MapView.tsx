'use client';

import { MapContainer, TileLayer, Marker, Popup, AttributionControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Order } from '@/lib/types';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface Props {
  orders: Order[];
}

export default function MapView({ orders }: Props) {
  const published = orders.filter(
    (o) => o.lat && o.lon && o.status === 'published'
  );

  return (
    <MapContainer
      center={[54.9894, 73.3667]}
      zoom={12}
      className="h-full w-full"
      scrollWheelZoom={true}
      zoomControl={false}
      attributionControl={false}
    >
      <AttributionControl position="bottomright" prefix={false} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {published.map((order) => (
        <Marker key={order.order_id} position={[order.lat, order.lon]}>
          <Popup>
            <div className="text-sm space-y-2 min-w-[200px] p-1">
              <p className="font-bold text-base text-gray-900">Заказ #{order.order_id}</p>
              <div className="space-y-1.5 text-gray-600">
                <p className="flex items-center gap-1.5">
                  <span className="text-gray-400">📍</span> {order.address}
                </p>
                {order.worker_payout != null ? (
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-600">
                    💵 На руки: {order.worker_payout.toLocaleString('ru-RU')}₽
                  </p>
                ) : order.payment_text && (
                  <p className="flex items-center gap-1.5">💰 {order.payment_text}</p>
                )}
                {order.time && <p className="flex items-center gap-1.5">⏰ {order.time}</p>}
                <p className="flex items-center gap-1.5">📋 {order.work_type}</p>
              </div>
              {order.yandex_link && (
                <a
                  href={order.yandex_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center gap-1.5 mt-1 text-brand-yandex
                    font-semibold text-xs hover:underline
                  "
                >
                  🗺 Открыть маршрут →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
