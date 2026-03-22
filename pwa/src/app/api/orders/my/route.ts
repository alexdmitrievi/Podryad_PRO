import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';
import { getOrdersByCustomer, getOrdersByExecutor, orderFromDb } from '@/lib/db';

export async function GET() {
  try {
    const viewer = await getViewerSession();
    if (!viewer) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const rows = viewer.role === 'worker'
      ? await getOrdersByExecutor(viewer.user_id)
      : await getOrdersByCustomer(viewer.user_id);

    const orders = rows.map((r) => {
      const o = orderFromDb(r as Record<string, unknown>);
      // Скрываем маржу от клиентов
      const { margin, ...safe } = o;
      void margin;
      return safe;
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('GET /api/orders/my error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
