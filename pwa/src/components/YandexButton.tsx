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
      className="flex items-center justify-center gap-2
                 bg-[#FC3F1D] text-white px-4 py-2.5
                 rounded-xl font-medium text-sm w-full
                 hover:bg-[#e63519] active:scale-[0.98]
                 transition-all shadow-sm"
    >
      🗺 Открыть в Яндекс.Картах
    </a>
  );
}
