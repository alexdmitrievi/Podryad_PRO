import { NextResponse } from 'next/server';
import { getEquipment } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;

    const items = await getEquipment(category);
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/equipment error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
