import { NextRequest, NextResponse } from 'next/server';
import { getTelegramIdFromSession } from '@/lib/auth';
import type { PushSubscriptionData } from '@/lib/push';
import { savePushSubscription } from '@/lib/push-subs';
import { getWorkerByTelegramId } from '@/lib/sheets';

const ROLES = new Set(['customer', 'worker']);

export async function POST(req: NextRequest) {
  const userId = await getTelegramIdFromSession();
  if (!userId) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }

  let body: {
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    phone?: string;
    role?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint?.trim();
  const p256dh = sub?.keys?.p256dh?.trim();
  const auth = sub?.keys?.auth?.trim();
  const role = body.role?.trim() ?? '';

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: 'Нужны subscription.endpoint и keys (p256dh, auth)' },
      { status: 400 }
    );
  }

  if (!ROLES.has(role)) {
    return NextResponse.json(
      { error: 'Укажите role: customer или worker' },
      { status: 400 }
    );
  }

  let phone = body.phone?.trim() ?? '';
  if (!phone) {
    const worker = await getWorkerByTelegramId(userId);
    phone = worker?.phone?.trim() ?? '';
  }

  const subscription: PushSubscriptionData = {
    endpoint,
    keys: { p256dh, auth },
  };

  try {
    await savePushSubscription(userId, phone, role, subscription);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg === 'GOOGLE_CREDENTIALS_MISSING' ||
      msg === 'GOOGLE_SHEETS_ID_MISSING'
    ) {
      return NextResponse.json(
        { error: 'Сервер не настроен для сохранения подписок' },
        { status: 503 }
      );
    }
    console.error('savePushSubscription:', e);
    return NextResponse.json(
      { error: 'Не удалось сохранить подписку' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
