import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

/**
 * GET /api/site-images
 * Public endpoint. Returns all hero/category image slots as a slug→url map.
 * Called from the landing page and /catalog/[category] to hydrate banners.
 *
 * Response: { images: { [slug: string]: string | null } }
 */
export const revalidate = 60;

export async function GET() {
  const db = getServiceClient();
  const { data, error } = await db
    .from('site_images')
    .select('slug, image_url');

  if (error) {
    log.error('GET /api/site-images', { error: String(error) });
    return NextResponse.json({ images: {} }, { status: 200 });
  }

  const images: Record<string, string | null> = {};
  for (const row of data ?? []) {
    images[row.slug] = row.image_url ?? null;
  }

  return NextResponse.json(
    { images },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
