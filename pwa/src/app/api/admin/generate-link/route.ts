import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json(
      { error: 'ADMIN_PIN не настроен в .env.local' },
      { status: 500 }
    );
  }

  let body: { pin: string; name: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.pin !== adminPin) {
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Укажите имя' }, { status: 400 });
  }

  const userId = `max_${Date.now()}`;
  const token = await createSession(userId);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://podryadpro.ru';
  const accessLink = `${siteUrl}/auth/token?token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    userId,
    name: body.name.trim(),
    phone: body.phone?.trim() || '',
    accessLink,
    token,
  });
}
