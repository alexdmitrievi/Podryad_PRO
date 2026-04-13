import { NextResponse } from 'next/server';
import { verifyConfirmationToken } from '@/lib/auth';
import {
  getOrderById,
  updateOrder,
} from '@/lib/db';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    let body: { token?: unknown; role?: unknown };
    try {
      body = (await req.json()) as { token?: unknown; role?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { token, role } = body;

    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }
    if (role !== 'customer' && role !== 'supplier') {
      return NextResponse.json({ error: 'role must be customer or supplier' }, { status: 400 });
    }

    // Verify JWT confirmation token
    const payload = verifyConfirmationToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token' },
        { status: 401 }
      );
    }

    // Cross-check token matches request params
    if (payload.orderId !== id || payload.role !== role) {
      return NextResponse.json(
        { error: 'Token does not match this order/role' },
        { status: 401 }
      );
    }

    // Fetch order
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Идемпотентность — повторное подтверждение возвращает 200
    if (role === 'customer' && order.customer_confirmed === true) {
      return NextResponse.json({ status: 'already_confirmed', role: 'customer' });
    }
    if (role === 'supplier' && order.supplier_confirmed === true) {
      return NextResponse.json({ status: 'already_confirmed', role: 'supplier' });
    }

    const now = new Date().toISOString();

    if (role === 'customer') {
      await updateOrder(id, {
        customer_confirmed: true,
        customer_confirmed_at: now,
      });
    } else {
      await updateOrder(id, {
        supplier_confirmed: true,
        supplier_confirmed_at: now,
      });
    }

    // Проверяем, оба ли подтвердили
    const updated = await getOrderById(id);
    const bothConfirmed =
      updated?.customer_confirmed === true && updated?.supplier_confirmed === true;

    if (bothConfirmed) {
      // Обе стороны подтвердили выполнение.
      // Платёж и выплата исполнителю — ручная оркестрация через CRM admin-панель.
      await updateOrder(id, { status: 'confirming' });
    }

    return NextResponse.json({
      status: 'confirmed',
      role,
      bothConfirmed,
    });
  } catch (error) {
    console.error('POST /api/orders/[id]/confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
