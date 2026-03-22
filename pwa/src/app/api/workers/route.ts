import { NextResponse } from 'next/server';
import { getTopWorkers } from '@/lib/db';

interface TopWorker {
  name: string;
  rating: number;
  jobs_count: number;
  is_vip: boolean;
  skills: string;
}

export async function GET() {
  try {
    const rows = await getTopWorkers(20);
    const workers: TopWorker[] = rows.map((w) => ({
      name: (w.name as string) || (w.username as string) || 'Исполнитель',
      rating: typeof w.rating === 'string' ? parseFloat(w.rating) : Number(w.rating) || 5,
      jobs_count: Number(w.jobs_count) || 0,
      is_vip: Boolean(w.is_vip),
      skills: String(w.skills ?? ''),
    }));
    return NextResponse.json(workers);
  } catch (error) {
    console.error('GET /api/workers error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки исполнителей' },
      { status: 500 }
    );
  }
}
