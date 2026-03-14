import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/sheets';

export async function GET() {
  try {
    const orders = await fetchOrders('published');
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки заказов' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.address || typeof body.address !== 'string' || body.address.length < 3) {
      return NextResponse.json({ error: 'Укажите адрес (минимум 3 символа)' }, { status: 400 });
    }
    if (!body.work_type || typeof body.work_type !== 'string') {
      return NextResponse.json({ error: 'Укажите тип работы' }, { status: 400 });
    }

    const webhookBase = process.env.N8N_WEBHOOK_BASE;
    if (!webhookBase) {
      throw new Error('N8N_WEBHOOK_BASE not configured');
    }

    const res = await fetch(`${webhookBase}/order-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'pwa',
        address: String(body.address).slice(0, 500),
        work_type: String(body.work_type).slice(0, 100),
        time: String(body.time ?? '').slice(0, 100),
        payment: String(body.payment ?? '').slice(0, 100),
        people: Math.max(1, Math.min(50, parseInt(body.people) || 1)),
        hours: Math.max(1, Math.min(24, parseInt(body.hours) || 1)),
        comment: String(body.comment ?? '').slice(0, 1000),
      }),
    });

    if (!res.ok) {
      throw new Error(`n8n webhook error: ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Orders POST error:', error);
    return NextResponse.json(
      { error: 'Ошибка отправки заказа' },
      { status: 500 }
    );
  }
}
