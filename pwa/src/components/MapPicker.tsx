'use client';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon (Leaflet issue with webpack)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

interface Props {
  lat?: number;
  lng?: number;
  onSelect: (lat: number, lng: number) => void;
  city: string;
}

export default function MapPicker({ lat, lng, onSelect, city }: Props) {
  const center: [number, number] = city === 'novosibirsk'
    ? [55.0084, 82.9357]
    : [54.9885, 73.3242];

  return (
    <MapContainer
      center={lat && lng ? [lat, lng] : center}
      zoom={13}
      style={{ height: '200px', borderRadius: '12px', zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      <ClickHandler onSelect={onSelect} />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
