'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Order } from '@/lib/types';

// Fix default marker icons in Next.js
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
      className="h-full w-full rounded-b-2xl"
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />
      {published.map((order) => (
        <Marker key={order.order_id} position={[order.lat, order.lon]}>
          <Popup>
            <div className="text-sm space-y-1 min-w-[180px]">
              <p className="font-bold text-base">#{order.order_id}</p>
              <p>📍 {order.address}</p>
              {order.payment && <p>💰 {order.payment}</p>}
              {order.time && <p>⏰ {order.time}</p>}
              <p>📋 {order.work_type}</p>
              <a
                href={order.yandex_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 text-[#FC3F1D] font-medium text-xs"
              >
                🗺 Открыть маршрут →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
