import { log } from '@/lib/logger';

const OMSK_DEFAULT = { lat: 54.9894, lon: 73.3667 };

export async function geocode(address: string): Promise<{ lat: number; lon: number }> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('accept-language', 'ru');
    url.searchParams.set('countrycodes', 'ru');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'PodraydPRO/1.0 (admin@podryad.pro)' },
      next: { revalidate: 3600 },
    });

    const data = await res.json();
    if (!data[0]) {
      log.warn('[Nominatim] No results, falling back to Omsk', { address });
      return OMSK_DEFAULT;
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  } catch (err) {
    log.error('[Nominatim] Geocoding failed, falling back to Omsk', { address, error: String(err) });
    return OMSK_DEFAULT;
  }
}

export function buildYandexLink(lat: number, lon: number, address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&text=${encoded}`;
}
