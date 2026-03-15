import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/sheets';

export async function GET() {
  try {
    const orders = await getOrders('published');
    return NextResponse.json(orders);
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки заказов' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const webhookUrl = process.env.N8N_WEBHOOK_BASE + '/order-intake';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`n8n webhook returned ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { error: 'Ошибка отправки заказа' },
      { status: 500 }
    );
  }
}
