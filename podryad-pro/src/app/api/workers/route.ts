import { NextResponse } from 'next/server';
import { fetchWorkers } from '@/lib/sheets';

export async function GET() {
  try {
    const workers = await fetchWorkers();

    const topWorkers = workers
      .filter((w) => {
        if (!w.white_list || w.rating < 4.0) return false;
        if (!w.ban_until) return true;
        return new Date(w.ban_until) < new Date();
      })
      .sort((a, b) => {
        const ratingDiff = b.rating - a.rating;
        if (ratingDiff !== 0) return ratingDiff;
        return b.jobs_count - a.jobs_count;
      })
      .slice(0, 20)
      .map((w) => ({
        name: w.name,
        rating: w.rating,
        jobs_count: w.jobs_count,
        skills: w.skills,
        is_vip: w.is_vip,
      }));

    return NextResponse.json(topWorkers);
  } catch (error) {
    console.error('Workers GET error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки исполнителей' },
      { status: 500 }
    );
  }
}
