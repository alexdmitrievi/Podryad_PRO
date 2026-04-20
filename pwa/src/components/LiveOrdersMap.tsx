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
  labor: 'Рабочая сила',
  equipment: 'Техника',
  materials: 'Материалы',
  combo: 'Комбо',
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
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
    html: `
      <div style="position:relative;width:28px;height:28px;cursor:pointer;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          opacity:0.22;
          animation: live-map-ping 2.2s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          position:absolute;
          top:5px;left:5px;width:18px;height:18px;
          border-radius:50%;
          background:${color};
          border:2.5px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
        "></div>
      </div>
    `,
  });
}

/* ── Demo orders spread across Omsk's 5 districts ── */
const DEMO_ORDERS: PublicOrderMarker[] = [
  {
    order_id: 'demo-1', order_number: '101', work_type: 'labor',
    address: 'ул. Ленина, 25, Центральный р-н',
    address_lat: 54.9893, address_lng: 73.3686,
    status: 'pending', people_count: 4, hours: 8,
    created_at: new Date().toISOString(),
  },
  {
    order_id: 'demo-2', order_number: '102', work_type: 'equipment',
    address: 'ул. Красный Путь, 76, Кировский р-н',
    address_lat: 54.9815, address_lng: 73.2880,
    status: 'paid', people_count: 1, hours: 4,
    created_at: new Date().toISOString(), subcategory: 'Экскаватор 20 т',
  },
  {
    order_id: 'demo-3', order_number: '103', work_type: 'materials',
    address: 'пр. Мира, 32, Советский р-н',
    address_lat: 55.0185, address_lng: 73.3420,
    status: 'in_progress',
    created_at: new Date().toISOString(), subcategory: 'Бетон М300',
  },
  {
    order_id: 'demo-4', order_number: '104', work_type: 'labor',
    address: 'ул. 10 лет Октября, 40, Ленинский р-н',
    address_lat: 54.9520, address_lng: 73.3820,
    status: 'pending', people_count: 2, hours: 6,
    created_at: new Date().toISOString(),
  },
  {
    order_id: 'demo-5', order_number: '105', work_type: 'combo',
    address: 'ул. Воровского, 12, Октябрьский р-н',
    address_lat: 55.0040, address_lng: 73.4280,
    status: 'priced', people_count: 6, hours: 10,
    created_at: new Date().toISOString(),
  },
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
    setSelected(prev => prev?.order_id === order.order_id ? null : order);
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

    // Add zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstance.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 300);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  /* Render markers with hover tooltip + click detail card */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || orders.length === 0) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    orders.forEach((order) => {
      if (!order.address_lat || !order.address_lng) return;
      const wt = order.work_type || 'workers';
      const wLabel = WORK_TYPE_LABELS[wt] || wt;
      const wIcon = WORK_TYPE_ICONS[wt] || '📋';

      const marker = L.marker([order.address_lat, order.address_lng], {
        icon: createPulsingIcon(wt),
      }).addTo(map);

      // Hover tooltip — shows on desktop hover, immediately readable
      marker.bindTooltip(
        `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;min-width:140px;max-width:220px;">
          <div style="font-weight:700;color:#1a1a2e;margin-bottom:2px;">${wIcon} ${wLabel}</div>
          ${order.subcategory ? `<div style="color:#4B5563;margin-bottom:1px;">${order.subcategory}</div>` : ''}
          ${order.address ? `<div style="color:#6B7280;font-size:11px;">${order.address}</div>` : ''}
          ${order.people_count ? `<div style="color:#6B7280;font-size:11px;margin-top:2px;">👥 ${order.people_count} чел.${order.hours ? ` · ⏱ ${order.hours} ч.` : ''}</div>` : ''}
          <div style="color:#9CA3AF;font-size:10px;margin-top:3px;">Нажмите для деталей</div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -18],
          className: 'live-map-tooltip',
          opacity: 1,
        }
      );

      marker.on('click', () => handleSelect(order));
    });

    // Fit bounds with padding
    const pts = orders
      .filter((o) => o.address_lat && o.address_lng)
      .map((o) => [o.address_lat, o.address_lng] as L.LatLngTuple);
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 12 });
    }
  }, [orders, handleSelect]);

  const label = selected?.work_type ? WORK_TYPE_LABELS[selected.work_type] || selected.work_type : null;
  const icon = selected?.work_type ? WORK_TYPE_ICONS[selected.work_type] || '📋' : '📋';

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card bg-white">
      {/* Header badge */}
      <div className="absolute top-3 left-3 z-[500]">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-gray-700">
            {loading ? 'Загрузка…' : `${orders.length} активных заказов`}
          </span>
        </div>
      </div>

      {/* Legend — moves up when a card is selected */}
      <div
        className={`absolute left-3 z-[500] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 transition-all duration-300 ${
          selected ? 'bottom-[168px] sm:bottom-[156px]' : 'bottom-3'
        } sm:bottom-auto sm:top-3 sm:left-auto sm:right-3`}
      >
        <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2F5BFF]" />Рабочие</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />Техника</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />Материалы</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />Комбо</span>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full h-[380px] sm:h-[440px]"
        style={{ minHeight: 380 }}
      />

      {/* Selected order detail card — slides up from bottom */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-[500]">
          <div className="bg-white border-t border-gray-100 shadow-elevated px-4 pt-4 pb-5 rounded-b-2xl">
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${MARKER_COLORS[selected.work_type || 'workers']}18` }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {selected.order_number ? `Заказ #${selected.order_number}` : 'Заказ'}
                  </p>
                  {label && (
                    <span className="text-xs font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                      {label}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Закрыть"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {selected.address && (
              <p className="text-xs text-gray-500 mb-2 flex items-start gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {selected.address}
              </p>
            )}

            {selected.subcategory && (
              <p className="text-xs font-medium text-gray-700 mb-1.5">{selected.subcategory}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
              {selected.people_count && (
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  {selected.people_count} чел.
                </span>
              )}
              {selected.hours && (
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  {selected.hours} ч.
                </span>
              )}
              {selected.work_date && (
                <span>
                  📅 {new Date(selected.work_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            <a
              href="/order/new"
              className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Разместить похожий заказ →
            </a>
          </div>
        </div>
      )}

      {/* Animations + tooltip styles */}
      <style jsx global>{`
        @keyframes live-map-ping {
          0% { transform: scale(1); opacity: 0.22; }
          75%, 100% { transform: scale(2.8); opacity: 0; }
        }
        .live-map-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          padding: 8px 12px !important;
          font-size: 12px !important;
          color: #374151 !important;
        }
        .live-map-tooltip::before {
          border-top-color: white !important;
        }
        .leaflet-tooltip-top.live-map-tooltip::before {
          border-top-color: #e5e7eb !important;
        }
      `}</style>
    </div>
  );
}
