import { NextResponse } from 'next/server';
import { getViewerSession, getWorkerActor } from '@/lib/auth';
import {
  getOrderById,
  orderFromDb,
  getWorkerByUserId,
  validateWorkerAccess,
  atomicClaimOrder,
} from '@/lib/db';

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

    const rawId = (body as { order_id?: unknown }).order_id;
    const orderIdStr =
      rawId != null ? String(rawId).trim() : '';
    if (!orderIdStr) {
      return NextResponse.json({ error: 'Укажите order_id' }, { status: 400 });
    }

    // Проверяем профиль воркера (whitelist, рейтинг, бан)
    const workerRow = await getWorkerByUserId(actor.user_id);
    if (!workerRow) {
      return NextResponse.json(
        { error: 'Профиль исполнителя не найден. Пройдите регистрацию.' },
        { status: 403 }
      );
    }

    const validationError = validateWorkerAccess(workerRow);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 403 });
    }

    // Проверяем что заказ существует и published
    const row = await getOrderById(orderIdStr);
    if (!row) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const found = orderFromDb(row as Record<string, unknown>);
    if (found.status !== 'published') {
      return NextResponse.json({ error: 'Заказ уже занят' }, { status: 409 });
    }

    // Атомарный захват — если кто-то уже забрал, вернёт 0
    const claimed = await atomicClaimOrder(orderIdStr, actor.user_id);
    if (claimed === 0) {
      return NextResponse.json({ error: 'Заказ уже занят другим исполнителем' }, { status: 409 });
    }

    const order = orderFromDb({
      ...(row as Record<string, unknown>),
      status: 'closed',
      executor_id: actor.user_id,
    });

    // Уведомляем n8n (обновление Telegram-канала, уведомление заказчика)
    const webhookBase = process.env.N8N_WEBHOOK_BASE;
    if (webhookBase) {
      try {
        await fetch(`${webhookBase.replace(/\/$/, '')}/order-response-pwa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.order_id,
            executor_id: actor.user_id,
            executor_name: String(workerRow.name || ''),
            executor_phone: String(workerRow.phone || ''),
            order,
          }),
        });
      } catch (e) {
        // Не блокируем отклик из-за ошибки webhook — заказ уже захвачен
        console.error('n8n order-response-pwa webhook error:', e);
      }
    }

    const { margin, ...orderOut } = order;
    void margin;
    return NextResponse.json({ success: true, order: orderOut });
  } catch (error) {
    console.error('POST /api/orders/respond error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
