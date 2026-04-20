'use client';

import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';

/* ── Colors & labels ──────────────────────────────────────────── */
const MARKER_COLORS: Record<string, string> = {
  workers:   '#2F5BFF',
  labor:     '#2F5BFF',
  equipment: '#F59E0B',
  materials: '#10B981',
  combo:     '#8B5CF6',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  workers:   'Рабочие',
  labor:     'Рабочая сила',
  equipment: 'Техника',
  materials: 'Материалы',
  combo:     'Комбо',
};

const WORK_TYPE_ICONS: Record<string, string> = {
  workers: '👷', labor: '👷', equipment: '🚜', materials: '📦', combo: '🔧',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Новый',             color: 'bg-gray-100 text-gray-600'    },
  priced:       { label: 'В обработке',       color: 'bg-amber-100 text-amber-700'  },
  payment_sent: { label: 'В обработке',       color: 'bg-amber-100 text-amber-700'  },
  paid:         { label: 'Оплачен',           color: 'bg-blue-100 text-blue-700'    },
  in_progress:  { label: 'В работе',          color: 'bg-green-100 text-green-700'  },
  published:    { label: 'Ищем исполнителя',  color: 'bg-brand-50 text-brand-600'   },
};

/* ── City bounding boxes for filtering ───────────────────────── */
const CITY_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  omsk:        { latMin: 54.75, latMax: 55.15, lngMin: 73.10, lngMax: 73.65 },
  novosibirsk: { latMin: 54.70, latMax: 55.20, lngMin: 82.70, lngMax: 83.20 },
};

/* ── Pulsing DivIcon by work_type ─────────────────────────────── */
function createPulsingIcon(workType: string): L.DivIcon {
  const color = MARKER_COLORS[workType] || '#2F5BFF';
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
    html: `<div style="position:relative;width:28px;height:28px;cursor:pointer;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.22;animation:orders-map-ping 2.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;top:5px;left:5px;width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>
    </div>`,
  });
}

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

/* ── Recenter map when city changes ───────────────────────────── */
function CityController({ city, orders }: { city: string; orders: PublicOrder[] }) {
  const map = useMap();
  const prevCity = useRef(city);

  useEffect(() => {
    if (prevCity.current === city) return;
    prevCity.current = city;

    const bounds = CITY_BOUNDS[city];
    const cityOrders = bounds
      ? orders.filter(o =>
          o.address_lat >= bounds.latMin && o.address_lat <= bounds.latMax &&
          o.address_lng >= bounds.lngMin && o.address_lng <= bounds.lngMax
        )
      : [];

    if (cityOrders.length > 1) {
      map.fitBounds(
        L.latLngBounds(cityOrders.map(o => [o.address_lat, o.address_lng] as L.LatLngTuple)),
        { padding: [60, 60], maxZoom: 13, animate: true }
      );
    } else {
      const center: [number, number] = city === 'novosibirsk'
        ? [55.0084, 82.9357]
        : [54.9885, 73.3242];
      map.setView(center, 12, { animate: true });
    }
  }, [city, orders, map]);

  return null;
}

export default function OrdersMap({ orders, city }: Props) {
  const center: [number, number] =
    city === 'novosibirsk' ? [55.0084, 82.9357] : [54.9885, 73.3242];

  // Filter orders to current city
  const bounds = CITY_BOUNDS[city];
  const visibleOrders = bounds
    ? orders.filter(o =>
        o.address_lat >= bounds.latMin && o.address_lat <= bounds.latMax &&
        o.address_lng >= bounds.lngMin && o.address_lng <= bounds.lngMax
      )
    : orders;

  // Show all orders if city filter finds none (fallback)
  const displayOrders = visibleOrders.length > 0 ? visibleOrders : orders;

  return (
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes orders-map-ping {
          0% { transform: scale(1); opacity: 0.22; }
          75%, 100% { transform: scale(2.8); opacity: 0; }
        }
        .orders-map-popup .leaflet-popup-content-wrapper {
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14);
          padding: 0;
          overflow: hidden;
          border: 1px solid #f3f4f6;
        }
        .orders-map-popup .leaflet-popup-content {
          margin: 0;
          width: 240px !important;
        }
        .orders-map-popup .leaflet-popup-tip-container {
          display: none;
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={12}
        style={{ height: 'calc(100dvh - 64px)', width: '100%' }}
        attributionControl={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        {/* Zoom control bottom-right */}
        <ZoomControlBottomRight />

        <CityController city={city} orders={orders} />

        {/* Legend overlay */}
        <Legend />

        {displayOrders.map((order) => {
          const wt = order.work_type || 'workers';
          const wLabel = WORK_TYPE_LABELS[wt] ?? wt;
          const wIcon = WORK_TYPE_ICONS[wt] ?? '📋';
          const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
          const color = MARKER_COLORS[wt] || '#2F5BFF';

          return (
            <Marker
              key={order.order_id}
              position={[order.address_lat, order.address_lng]}
              icon={createPulsingIcon(wt)}
              eventHandlers={{
                mouseover: (e) => e.target.openPopup(),
                mouseout: (e) => {
                  // Small delay so user can move cursor to popup
                  setTimeout(() => e.target.closePopup(), 200);
                },
                click: (e) => e.target.openPopup(),
              }}
            >
              <Popup
                className="orders-map-popup"
                closeButton={false}
                autoPan={false}
              >
                <div>
                  {/* Colored header strip */}
                  <div style={{ background: color, padding: '10px 14px' }} className="flex items-center gap-2">
                    <span className="text-base">{wIcon}</span>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">
                        {order.order_number ? `Заказ #${order.order_number}` : 'Заказ'}
                      </p>
                      <p className="text-white/80 text-xs">{wLabel}</p>
                    </div>
                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-3.5 py-3 space-y-1.5">
                    {order.subcategory && (
                      <p className="text-xs font-semibold text-gray-800">{order.subcategory}</p>
                    )}
                    {order.address && (
                      <p className="text-xs text-gray-500 flex items-start gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {order.address}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs text-gray-600 pt-0.5">
                      {order.people_count && (
                        <span className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                          👥 {order.people_count} чел.
                        </span>
                      )}
                      {order.hours && (
                        <span className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                          ⏱ {order.hours} ч.
                        </span>
                      )}
                      {order.work_date && (
                        <span className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                          📅 {new Date(order.work_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    <Link
                      href="/order/new"
                      className="mt-1 block w-full text-center font-semibold text-xs py-2 rounded-lg text-white transition-colors"
                      style={{ background: color }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Разместить похожий заказ →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}

/* ── Zoom control via portal ──────────────────────────────────── */
function ZoomControlBottomRight() {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control.zoom({ position: 'bottomright' }).addTo(map);
    return () => { ctrl.remove(); };
  }, [map]);
  return null;
}

/* ── Legend overlay ───────────────────────────────────────────── */
function Legend() {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.12);padding:8px 12px;font-family:system-ui,sans-serif;">
          <div style="display:flex;gap:12px;align-items:center;font-size:11px;font-weight:600;color:#6B7280;">
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#2F5BFF;display:inline-block;"></span>Рабочие</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>Техника</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#10B981;display:inline-block;"></span>Материалы</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#8B5CF6;display:inline-block;"></span>Комбо</span>
          </div>
        </div>
      `;
      containerRef.current = div;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    legend.addTo(map);
    return () => { legend.remove(); };
  }, [map]);

  return null;
}
