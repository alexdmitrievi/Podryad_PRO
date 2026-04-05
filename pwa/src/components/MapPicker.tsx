'use client';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom red marker icon (no default blue-yellow Leaflet marker)
const redIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#2F5BFF"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
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
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler onSelect={onSelect} />
      {lat && lng && <Marker position={[lat, lng]} icon={redIcon} />}
    </MapContainer>
  );
}
