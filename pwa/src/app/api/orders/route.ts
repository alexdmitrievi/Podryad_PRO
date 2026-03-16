import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/sheets';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте через минуту.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    if (!body.address || typeof body.address !== 'string' || body.address.length < 3) {
      return NextResponse.json({ error: 'Укажите адрес (минимум 3 символа)' }, { status: 400 });
    }
    if (!body.work_type || typeof body.work_type !== 'string') {
      return NextResponse.json({ error: 'Укажите тип работы' }, { status: 400 });
    }

    const webhookBase = process.env.N8N_WEBHOOK_BASE;
    if (!webhookBase) {
      console.error('N8N_WEBHOOK_BASE is not configured');
      return NextResponse.json({ error: 'Сервис временно недоступен' }, { status: 503 });
    }

    const res = await fetch(`${webhookBase}/order-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'pwa',
        address: String(body.address).slice(0, 500),
        work_type: String(body.work_type).slice(0, 100),
        time: String(body.time ?? '').slice(0, 100),
        people: Math.max(1, Math.min(50, parseInt(body.people) || 1)),
        hours: Math.max(1, Math.min(24, parseInt(body.hours) || 1)),
        comment: String(body.comment ?? '').slice(0, 1000),
      }),
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
