import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';
import { getOrderById, orderFromDb, updateOrder } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const viewer = await getViewerSession();
    if (!viewer) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    let body: { order_id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    const orderId = body.order_id?.trim();
    if (!orderId) {
      return NextResponse.json({ error: 'Укажите order_id' }, { status: 400 });
    }

    const row = await getOrderById(orderId);
    if (!row) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const order = orderFromDb(row as Record<string, unknown>);

    // Завершить может только заказчик или исполнитель
    if (order.customer_id !== viewer.user_id && order.executor_id !== viewer.user_id) {
      return NextResponse.json({ error: 'Нет доступа к этому заказу' }, { status: 403 });
    }

    if (order.status !== 'closed') {
      return NextResponse.json({ error: 'Заказ не в статусе "закрыт"' }, { status: 409 });
    }

    await updateOrder(orderId, { status: 'done' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/orders/complete error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
