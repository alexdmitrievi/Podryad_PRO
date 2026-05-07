'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapOrder {
  order_id: string;
  order_number: string | null;
  address: string;
  lat: number;
  lon: number;
  work_type: string;
}

const MARKER_COLORS: Record<string, string> = {
  labor: '#2F5BFF',
  complex: '#8B5CF6',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  labor: 'Рабочая сила',
  complex: 'Комплексный',
};

function createPin(color: string) {
  return L.divIcon({
    className: '',
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`,
  });
}

interface Props {
  /** 'select' — user picks a point; 'display' — show order markers */
  mode: 'select' | 'display';
  orders?: MapOrder[];
  selectedLocation?: { lat: number; lon: number } | null;
  onLocationSelect?: (lat: number, lon: number) => void;
  onOrderClick?: (order: MapOrder) => void;
  center?: [number, number];
  zoom?: number;
}

export default function InteractiveMap({
  mode,
  orders = [],
  selectedLocation,
  onLocationSelect,
  onOrderClick,
  center = [54.99, 73.37],
  zoom = 12,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onLocationSelect);
  const onClickRef = useRef(onOrderClick);
  onSelectRef.current = onLocationSelect;
  onClickRef.current = onOrderClick;

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    if (mode === 'select') {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng: lon } = e.latlng;

        // Update or create pin
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
        } else {
          markerRef.current = L.marker([lat, lon], {
            icon: createPin('#2F5BFF'),
            draggable: true,
          }).addTo(map);

          markerRef.current.on('dragend', () => {
            const pos = markerRef.current?.getLatLng();
            if (pos) onSelectRef.current?.(pos.lat, pos.lng);
          });
        }
        onSelectRef.current?.(lat, lon);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display mode: add order markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'display') return;

    // Clear old markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const bounds: L.LatLngExpression[] = [];

    orders.forEach((order) => {
      if (!order.lat || !order.lon) return;

      const color = MARKER_COLORS[order.work_type] || '#2F5BFF';
      const label = WORK_TYPE_LABELS[order.work_type] || order.work_type;

      const marker = L.marker([order.lat, order.lon], {
        icon: createPin(color),
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:200px">
          <strong>#${order.order_number || order.order_id.slice(0, 8)}</strong>
          <span style="display:inline-block;background:#f3f4f6;border-radius:8px;padding:2px 8px;font-size:11px;margin-left:4px">${label}</span>
          <br/><span style="color:#6b7280;font-size:13px">${order.address}</span>
          <br/><a href="https://yandex.ru/maps/?pt=${order.lon},${order.lat}&z=16" target="_blank" rel="noopener" style="color:#2F5BFF;font-size:12px;text-decoration:none">Открыть в Яндекс.Картах</a>
        </div>
      `);

      marker.on('click', () => onClickRef.current?.(order));

      bounds.push([order.lat, order.lon]);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 14 });
    }
  }, [orders, mode]);

  // Select mode: update marker position when selectedLocation changes from outside
  const flyToLocation = useCallback((loc: { lat: number; lon: number }) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([loc.lat, loc.lon]);
    } else {
      markerRef.current = L.marker([loc.lat, loc.lon], {
        icon: createPin('#2F5BFF'),
        draggable: true,
      }).addTo(map);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng();
        if (pos) onSelectRef.current?.(pos.lat, pos.lng);
      });
    }

    map.flyTo([loc.lat, loc.lon], 15, { duration: 0.5 });
  }, []);

  useEffect(() => {
    if (selectedLocation && mode === 'select') {
      flyToLocation(selectedLocation);
    }
  }, [selectedLocation, mode, flyToLocation]);

  return <div ref={containerRef} className="w-full h-full" />;
}
