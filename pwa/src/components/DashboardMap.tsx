'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface PublicOrder {
  order_id: string;
  order_number: string | null;
  address: string;
  lat: number;
  lon: number;
  work_type: string;
  people: number;
  hours: number;
  comment: string | null;
  created_at: string;
  customer_total: number | null;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  labor: 'Рабочая сила',
  equipment: 'Техника',
  materials: 'Материалы',
  complex: 'Комплексный',
};

const MARKER_COLORS: Record<string, string> = {
  labor: '#2F5BFF',
  equipment: '#F59E0B',
  materials: '#10B981',
  complex: '#8B5CF6',
};

function createMarkerIcon(workType: string) {
  const color = MARKER_COLORS[workType] || '#2F5BFF';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

interface Props {
  orders: PublicOrder[];
  onSelectOrder: (order: PublicOrder) => void;
}

export default function DashboardMap({ orders, onSelectOrder }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Default center: Omsk
    const center: L.LatLngExpression = [54.99, 73.37];

    const map = L.map(mapRef.current, {
      center,
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const bounds: L.LatLngExpression[] = [];

    orders.forEach((order) => {
      if (!order.lat || !order.lon) return;

      const marker = L.marker([order.lat, order.lon], {
        icon: createMarkerIcon(order.work_type),
      }).addTo(map);

      const label = WORK_TYPE_LABELS[order.work_type] || order.work_type;
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <strong>#${order.order_number || order.order_id.slice(0, 8)}</strong>
          <span style="display:inline-block;background:#f3f4f6;border-radius:8px;padding:1px 6px;font-size:11px;margin-left:4px">${label}</span>
          <br/><span style="color:#6b7280;font-size:13px">${order.address}</span>
        </div>
      `);

      marker.on('click', () => onSelectOrder(order));

      bounds.push([order.lat, order.lon]);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    }
  }, [orders, onSelectOrder]);

  return <div ref={mapRef} className="w-full h-full" />;
}
