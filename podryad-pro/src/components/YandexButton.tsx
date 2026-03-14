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
      className="flex items-center justify-center gap-2 bg-brand-red text-white px-4 py-2 rounded-xl font-medium text-sm w-full hover:bg-brand-red-dark transition-colors"
    >
      🗺 Открыть в Яндекс.Картах
    </a>
  );
}
