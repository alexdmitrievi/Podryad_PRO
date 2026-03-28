import { NextResponse } from 'next/server';

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

    // Validate phone
    if (!body.phone || typeof body.phone !== 'string') {
      return NextResponse.json({ error: 'Укажите номер телефона' }, { status: 400 });
    }
    const phoneDigits = body.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return NextResponse.json({ error: 'Некорректный номер телефона' }, { status: 400 });
    }

    // Validate materials
    if (!body.materials || !Array.isArray(body.materials) || body.materials.length === 0) {
      return NextResponse.json({ error: 'Выберите хотя бы один материал' }, { status: 400 });
    }

    const validMaterials = ['beton', 'bitum', 'sheben', 'pesok', 'toplivo'];
    const materials = body.materials.filter((m: string) => validMaterials.includes(m));

    if (materials.length === 0) {
      return NextResponse.json({ error: 'Некорректный выбор материалов' }, { status: 400 });
    }

    const webhookBase = process.env.N8N_WEBHOOK_BASE;
    if (!webhookBase) {
      console.error('N8N_WEBHOOK_BASE is not configured');
      return NextResponse.json({ error: 'Сервис временно недоступен' }, { status: 503 });
    }

    const res = await fetch(`${webhookBase}/materials-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'pwa',
        phone: String(body.phone).slice(0, 50),
        materials: materials.map((m: string) => String(m).slice(0, 50)),
        comment: String(body.comment ?? '').slice(0, 1000),
        ip: clientIp,
      }),
    });

    if (!res.ok) {
      throw new Error(`n8n webhook returned ${res.status}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Заявка принята',
    });
  } catch (error) {
    console.error('POST /api/materials error:', error);
    return NextResponse.json(
      { error: 'Ошибка отправки заявки' },
      { status: 500 }
    );
  }
}
