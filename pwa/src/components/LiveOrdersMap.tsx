'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface PublicOrderMarker {
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

const WORK_TYPE_LABELS: Record<string, string> = {
  workers: 'Рабочие',
  equipment: 'Техника',
  materials: 'Материалы',
  combo: 'Комбо',
  labor: 'Рабочая сила',
};

const WORK_TYPE_ICONS: Record<string, string> = {
  workers: '👷',
  labor: '👷',
  equipment: '🚜',
  materials: '📦',
  combo: '🔧',
};

const MARKER_COLORS: Record<string, string> = {
  workers: '#2F5BFF',
  labor: '#2F5BFF',
  equipment: '#F59E0B',
  materials: '#10B981',
  combo: '#8B5CF6',
};

function createPulsingIcon(workType: string) {
  const color = MARKER_COLORS[workType] || '#2F5BFF';
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          opacity:0.25;
          animation: live-map-ping 2s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          position:absolute;
          top:4px;left:4px;width:16px;height:16px;
          border-radius:50%;
          background:${color};
          border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
  });
}

/* ── Static fallback orders for empty DB ── */
const DEMO_ORDERS: PublicOrderMarker[] = [
  { order_id: 'demo-1', order_number: '101', work_type: 'workers', address: 'ул. Ленина, 25', address_lat: 54.9893, address_lng: 73.3686, status: 'published', people_count: 4, hours: 8, created_at: new Date().toISOString() },
  { order_id: 'demo-2', order_number: '102', work_type: 'equipment', address: 'Красный Путь, 101', address_lat: 54.9760, address_lng: 73.3820, status: 'paid', people_count: 1, hours: 4, created_at: new Date().toISOString(), subcategory: 'Экскаватор' },
  { order_id: 'demo-3', order_number: '103', work_type: 'materials', address: 'пр. Мира, 55', address_lat: 55.0010, address_lng: 73.3450, status: 'in_progress', created_at: new Date().toISOString(), subcategory: 'Бетон М300' },
  { order_id: 'demo-4', order_number: '104', work_type: 'workers', address: 'ул. 10 лет Октября, 40', address_lat: 54.9650, address_lng: 73.3950, status: 'published', people_count: 2, hours: 6, created_at: new Date().toISOString() },
  { order_id: 'demo-5', order_number: '105', work_type: 'combo', address: 'ул. Герцена, 12', address_lat: 54.9950, address_lng: 73.3550, status: 'published', people_count: 6, hours: 10, created_at: new Date().toISOString() },
];

export default function LiveOrdersMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [orders, setOrders] = useState<PublicOrderMarker[]>([]);
  const [selected, setSelected] = useState<PublicOrderMarker | null>(null);
  const [loading, setLoading] = useState(true);

  /* Fetch active orders */
  useEffect(() => {
    fetch('/api/orders/public')
      .then((r) => r.json())
      .then((d) => {
        const list = d.orders ?? [];
        setOrders(list.length > 0 ? list : DEMO_ORDERS);
      })
      .catch(() => setOrders(DEMO_ORDERS))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback((order: PublicOrderMarker) => {
    setSelected(order);
  }, []);

  /* Init map */
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [54.989, 73.368],
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
      attributionControl: false,
      touchZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
    }).addTo(map);

    mapInstance.current = map;

    // Leaflet needs explicit size recalc — critical for mobile browsers
    requestAnimationFrame(() => {
      map.invalidateSize();
      // Second pass after layout settles (mobile Safari needs extra time)
      setTimeout(() => map.invalidateSize(), 300);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  /* Render markers */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || orders.length === 0) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    orders.forEach((order) => {
      if (!order.address_lat || !order.address_lng) return;
      const marker = L.marker([order.address_lat, order.address_lng], {
        icon: createPulsingIcon(order.work_type || 'workers'),
      }).addTo(map);
      marker.on('click', () => handleSelect(order));
    });

    // Fit bounds if multiple orders
    const pts = orders
      .filter((o) => o.address_lat && o.address_lng)
      .map((o) => [o.address_lat, o.address_lng] as L.LatLngTuple);
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 13 });
    }
  }, [orders, handleSelect]);

  const label = selected?.work_type ? WORK_TYPE_LABELS[selected.work_type] || selected.work_type : null;
  const icon = selected?.work_type ? WORK_TYPE_ICONS[selected.work_type] || '📋' : '📋';

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card bg-white">
      {/* Header badge */}
      <div className="absolute top-3 left-3 z-[500] flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold text-gray-700">
            {loading ? 'Загрузка…' : `${orders.length} активных заказов`}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-[500] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2">
        <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#2F5BFF]"></span>Рабочие</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>Техника</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>Материалы</span>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full h-[380px] sm:h-[440px]"
        style={{ minHeight: 380 }}
      />

      {/* Selected order card */}
      {selected && (
        <div className="absolute bottom-4 left-4 right-4 z-[500] animate-slide-up">
          <div className="bg-white rounded-xl shadow-elevated border border-gray-100 p-4 max-w-sm mx-auto">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">
                    {selected.order_number ? `Заказ #${selected.order_number}` : 'Заказ'}
                  </span>
                  {label && (
                    <span className="ml-2 text-xs font-medium bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                      {label}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
                aria-label="Закрыть"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {selected.address && (
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {selected.address}
              </p>
            )}

            {selected.subcategory && (
              <p className="text-xs text-gray-600 mb-2">
                <span className="font-medium">{selected.subcategory}</span>
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
              {selected.people_count && (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  {selected.people_count} чел.
                </span>
              )}
              {selected.hours && (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {selected.hours} ч.
                </span>
              )}
              {selected.work_date && (
                <span className="flex items-center gap-1">
                  📅 {new Date(selected.work_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            <a
              href="/order/new"
              className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Разместить похожий заказ →
            </a>
          </div>
        </div>
      )}

      {/* CSS for pulsing animation */}
      <style jsx>{`
        @keyframes live-map-ping {
          0% { transform: scale(1); opacity: 0.25; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
