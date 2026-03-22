import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';
import { createPayment } from '@/lib/yukassa';
import { getServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const viewer = await getViewerSession();
    if (!viewer) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      description?: string;
      work_type?: string;
    };

    if (!body.description || typeof body.description !== 'string' || body.description.length < 5) {
      return NextResponse.json(
        { error: 'Опишите задачу (минимум 5 символов)' },
        { status: 400 },
      );
    }

    // Fetch top workers: white_list=true, rating >= 4.5, not banned, sorted by rating desc
    const db = getServiceClient();
    const { data: allWorkers, error: dbError } = await db
      .from('workers')
      .select('name, rating, jobs_count, skills, is_vip, ban_until')
      .eq('white_list', true)
      .gte('rating', 4.5)
      .order('rating', { ascending: false })
      .limit(20);

    if (dbError) {
      console.error('Supabase workers query error:', dbError);
      throw new Error('Ошибка загрузки исполнителей');
    }

    // Filter out banned workers and take top 3
    const now = new Date();
    const eligible = (allWorkers || []).filter((w) => {
      if (w.ban_until && new Date(w.ban_until) > now) return false;
      return true;
    });

    const top3 = eligible.slice(0, 3).map((w) => ({
      name: w.name,
      rating: Number(w.rating) || 0,
      jobs_count: Number(w.jobs_count) || 0,
      skills: w.skills || '',
      is_vip: Boolean(w.is_vip),
    }));

    if (top3.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено подходящих исполнителей' },
        { status: 404 },
      );
    }

    // Create YooKassa payment
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podryad.pro';

    const payment = await createPayment({
      amount: 1000,
      description: 'Подбор исполнителей Подряд PRO',
      returnUrl: `${siteUrl}/pick`,
      metadata: {
        type: 'pick',
        user_id: viewer.user_id,
        work_type: String(body.work_type || '').slice(0, 100),
      },
      idempotenceKey: crypto.randomUUID(),
    });

    return NextResponse.json({
      payment_url: payment.confirmationUrl,
      workers: top3,
    });
  } catch (error) {
    console.error('POST /api/pick error:', error);
    return NextResponse.json(
      { error: 'Ошибка подбора исполнителей' },
      { status: 500 },
    );
  }
}
