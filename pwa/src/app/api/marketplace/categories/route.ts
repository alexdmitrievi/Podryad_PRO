import { NextResponse } from 'next/server';
import { getMarketplaceCategories } from '@/lib/db';

export async function GET() {
  try {
    const categories = await getMarketplaceCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error('GET /api/marketplace/categories:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
