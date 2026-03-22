import { NextRequest, NextResponse } from 'next/server';
import { getTelegramIdFromSession } from '@/lib/auth';
import {
  PUSH_STORAGE_NOT_CONFIGURED,
  deactivatePushSubscription,
} from '@/lib/push-subs';

export async function POST(req: NextRequest) {
  const userId = await getTelegramIdFromSession();
  if (!userId) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: 'Нужен endpoint' }, { status: 400 });
  }

  try {
    await deactivatePushSubscription(endpoint, userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === PUSH_STORAGE_NOT_CONFIGURED) {
      return NextResponse.json(
        { error: 'Сервер не настроен' },
        { status: 503 }
      );
    }
    console.error('deactivatePushSubscription:', e);
    return NextResponse.json(
      { error: 'Не удалось отписаться' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
