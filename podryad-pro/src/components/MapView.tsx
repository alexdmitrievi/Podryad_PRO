'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Order } from '@/lib/sheets';

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

interface MapViewProps {
  orders: Order[];
}

export default function MapView({ orders }: MapViewProps) {
  const published = orders.filter(
    (o) => o.lat && o.lon && o.status === 'published'
  );

  return (
    <MapContainer
      center={[54.9894, 73.3667]}
      zoom={12}
      className="h-full w-full z-0"
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      {published.map((order) => (
        <Marker key={order.order_id} position={[order.lat, order.lon]}>
          <Popup>
            <div className="text-sm space-y-1 min-w-[180px]">
              <p className="font-bold">#{order.order_id} — {order.work_type}</p>
              <p>📍 {order.address}</p>
              {order.payment && <p>💰 {order.payment}</p>}
              {order.time && <p>⏰ {order.time}</p>}
              <a
                href={order.yandex_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red font-medium block mt-1"
              >
                🗺 Маршрут
              </a>
              <a
                href={`https://t.me/Podryad_PRO_bot?start=order_${order.order_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue font-medium block"
              >
                👍 Взять заказ
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
