import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';
import { getOrderById, orderFromDb, getWorkerByUserId, updateOrder } from '@/lib/db';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const viewer = await getViewerSession();
    if (!viewer) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    let body: { order_id?: string; score?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    const orderId = body.order_id?.trim();
    const score = Number(body.score);

    if (!orderId) {
      return NextResponse.json({ error: 'Укажите order_id' }, { status: 400 });
    }
    if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Оценка должна быть от 1 до 5' }, { status: 400 });
    }

    const row = await getOrderById(orderId);
    if (!row) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const order = orderFromDb(row as Record<string, unknown>);

    // Оценить может только заказчик
    if (order.customer_id !== viewer.user_id) {
      return NextResponse.json({ error: 'Только заказчик может оценить' }, { status: 403 });
    }

    if (order.status !== 'done' && order.status !== 'closed') {
      return NextResponse.json({ error: 'Заказ не завершён' }, { status: 409 });
    }

    if (!order.executor_id) {
      return NextResponse.json({ error: 'У заказа нет исполнителя' }, { status: 409 });
    }

    // Получаем воркера и пересчитываем рейтинг (формула из workflow 04)
    const worker = await getWorkerByUserId(order.executor_id);
    if (!worker) {
      return NextResponse.json({ error: 'Исполнитель не найден' }, { status: 404 });
    }

    const oldRating = Number(worker.rating) || 5.0;
    const jobsCount = Number(worker.jobs_count) || 0;
    const newRating = (oldRating * jobsCount + score) / (jobsCount + 1);
    const roundedRating = Math.round(newRating * 100) / 100;

    const updates: Record<string, unknown> = {
      rating: roundedRating,
      jobs_count: jobsCount + 1,
    };

    // Пенальти: рейтинг < 3.0 после 5+ заказов → бан на 30 дней
    if (roundedRating < 3.0 && jobsCount + 1 >= 5) {
      const banDate = new Date();
      banDate.setDate(banDate.getDate() + 30);
      updates.ban_until = banDate.toISOString();
    }

    const db = getServiceClient();
    await db
      .from('workers')
      .update(updates)
      .eq('telegram_id', String(worker.telegram_id));

    // Помечаем заказ как оценённый
    await updateOrder(orderId, { status: 'done' });

    return NextResponse.json({
      success: true,
      new_rating: roundedRating,
    });
  } catch (error) {
    console.error('POST /api/orders/rate error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
