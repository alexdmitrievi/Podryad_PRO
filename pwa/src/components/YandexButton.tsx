import { Navigation } from 'lucide-react';

interface Props {
  lat: number;
  lon: number;
  address: string;
}

export default function YandexButton({ lat, lon, address }: Props) {
  const link = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&text=${encodeURIComponent(address)}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex items-center justify-center gap-2
        bg-brand-yandex/10 text-brand-yandex
        px-4 py-2.5 rounded-2xl font-semibold text-sm w-full
        hover:bg-brand-yandex hover:text-white
        active:scale-[0.97] transition-all duration-200
      "
    >
      <Navigation size={16} />
      Маршрут
    </a>
  );
}
