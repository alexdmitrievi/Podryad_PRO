import { NextResponse } from 'next/server';
import { getViewerSession, getWorkerActor } from '@/lib/auth';
import { closePublishedOrder, findOrderRowById } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const actor = await getWorkerActor();
    if (!actor) {
      const viewer = await getViewerSession();
      if (!viewer) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Только исполнители' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    }

    const orderId = Number((body as { order_id?: unknown }).order_id);
    if (!Number.isFinite(orderId) || orderId < 1) {
      return NextResponse.json({ error: 'Укажите order_id' }, { status: 400 });
    }

    const found = await findOrderRowById(orderId);
    if (!found) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (found.order.status !== 'published') {
      return NextResponse.json({ error: 'Заказ уже занят' }, { status: 409 });
    }

    const order = await closePublishedOrder(orderId, actor.user_id);
    if (!order) {
      return NextResponse.json({ error: 'Заказ уже занят' }, { status: 409 });
    }

    const webhookBase = process.env.N8N_WEBHOOK_BASE;
    if (!webhookBase) {
      console.error('N8N_WEBHOOK_BASE is not configured');
      return NextResponse.json({ error: 'Сервис временно недоступен' }, { status: 500 });
    }

    const whRes = await fetch(`${webhookBase.replace(/\/$/, '')}/order-response-pwa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.order_id,
        executor_id: actor.user_id,
        order,
      }),
    });

    if (!whRes.ok) {
      console.error('n8n order-response-pwa returned', whRes.status);
      return NextResponse.json({ error: 'Ошибка уведомления' }, { status: 500 });
    }

    const { margin, ...orderOut } = order;
    void margin;
    return NextResponse.json({ success: true, order: orderOut });
  } catch (error) {
    console.error('POST /api/orders/respond error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
