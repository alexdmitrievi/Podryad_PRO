import { NextResponse } from 'next/server';
import { getViewerSession, type ViewerSession } from '@/lib/auth';
import type { Order } from '@/lib/types';
import { getOrderById } from '@/lib/sheets';

type OrderResponse = Record<string, unknown>;

function buildOrderPayload(order: Order, session: ViewerSession | null): OrderResponse {
  const publicFields: OrderResponse = {
    order_id: order.order_id,
    address: order.address,
    work_type: order.work_type,
    time: order.time,
    people: order.people,
    hours: order.hours,
    comment: order.comment ?? '',
    lat: order.lat,
    lon: order.lon,
    yandex_link: order.yandex_link,
    status: order.status,
    created_at: order.created_at,
  };

  if (!session) {
    return publicFields;
  }

  const withPaymentText = { ...publicFields, payment_text: order.payment_text };

  if (session.role === 'worker') {
    return {
      ...withPaymentText,
      worker_rate: order.worker_rate,
      worker_payout: order.worker_payout,
    };
  }

  if (session.role === 'customer' && session.user_id === order.customer_id) {
    return {
      ...withPaymentText,
      client_total: order.client_total,
    };
  }

  return withPaymentText;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const viewer = await getViewerSession();
    const payload = buildOrderPayload(order, viewer);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки заказа' }, { status: 500 });
  }
}
