import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification, type PushSubscriptionData } from '@/lib/push';
import {
  PUSH_STORAGE_NOT_CONFIGURED,
  deactivatePushSubscription,
  listPushSubscriptionsForSend,
} from '@/lib/push-subs';

function verifyBearer(req: NextRequest): boolean {
  const secret = process.env.PUSH_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  return token === secret;
}

export async function POST(req: NextRequest) {
  if (!verifyBearer(req)) {
    return NextResponse.json({ error: 'Недопустимый ключ' }, { status: 401 });
  }

  let body: {
    user_id?: string;
    phone?: string;
    role?: string;
    title?: string;
    body?: string;
    url?: string;
    icon?: string;
    badge?: string;
    tag?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const title = body.title?.trim();
  const text = body.body?.trim();
  if (!title || !text) {
    return NextResponse.json(
      { error: 'Нужны поля title и body' },
      { status: 400 }
    );
  }

  const hasUser = body.user_id !== undefined && body.user_id !== '';
  const hasPhone = body.phone !== undefined && body.phone !== '';
  const hasRole = body.role !== undefined && body.role !== '';

  const n = [hasUser, hasPhone, hasRole].filter(Boolean).length;
  if (n !== 1) {
    return NextResponse.json(
      { error: 'Укажите ровно одно из полей: user_id, phone, role' },
      { status: 400 }
    );
  }

  let recipients: Array<{
    userId: string;
    subscription: PushSubscriptionData;
  }>;
  try {
    if (hasUser) {
      recipients = await listPushSubscriptionsForSend({
        userId: String(body.user_id).trim(),
      });
    } else if (hasPhone) {
      recipients = await listPushSubscriptionsForSend({
        phone: String(body.phone).trim(),
      });
    } else {
      recipients = await listPushSubscriptionsForSend({
        role: String(body.role).trim(),
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === PUSH_STORAGE_NOT_CONFIGURED) {
      return NextResponse.json(
        { error: 'Сервер не настроен для чтения подписок' },
        { status: 503 }
      );
    }
    console.error('listPushSubscriptionsForSend:', e);
    return NextResponse.json(
      { error: 'Не удалось получить подписчиков' },
      { status: 500 }
    );
  }

  let sent = 0;
  let failed = 0;

  for (const { userId, subscription } of recipients) {
    const ok = await sendPushNotification(subscription, {
      title,
      body: text,
      url: body.url,
      icon: body.icon,
      badge: body.badge,
      tag: body.tag,
    });

    if (ok) {
      sent++;
    } else {
      failed++;
      try {
        await deactivatePushSubscription(subscription.endpoint, userId);
      } catch (err) {
        console.error('deactivate after failed push:', err);
      }
    }
  }

  return NextResponse.json({ sent, failed });
}
