import webPush from 'web-push';
import { log } from '@/lib/logger';

// Инициализация (серверная сторона)
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@podryadpro.ru';

if (vapidPublic && vapidPrivate) {
  webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string; // куда перейти при клике
  tag?: string; // группировка уведомлений
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }
    );
    return true;
  } catch (error: unknown) {
    const statusCode =
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : undefined;
    const message =
      error instanceof Error ? error.message : String(error);

    if (statusCode === 410 || statusCode === 404) {
      log.info('Push subscription expired', { endpointSuffix: subscription.endpoint.slice(-20) });
      return false;
    }
    log.error('Push error', { error: message });
    return false;
  }
}

export async function sendCustomerPush(
  phone: string,
  title: string,
  body: string,
  url?: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  try {
    const { getServiceClient } = await import('@/lib/supabase');
    const db = getServiceClient();

    const { data: tokens } = await db
      .from('customer_tokens')
      .select('access_token')
      .eq('phone', phone);

    if (!tokens?.length) return { sent, failed };

    const tokenValues = tokens.map((t: { access_token: string }) => t.access_token);

    const { data: subs } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('access_token', tokenValues);

    if (!subs?.length) return { sent, failed };

    for (const sub of subs as Array<{ endpoint: string; p256dh: string; auth: string }>) {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title, body, url },
      );
      if (ok) sent++; else failed++;
    }
  } catch (err) {
    log.error('sendCustomerPush failed', { error: String(err) });
  }

  return { sent, failed };
}

export async function broadcastPush(
  title: string,
  body: string,
  url?: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  try {
    const { getServiceClient } = await import('@/lib/supabase');
    const db = getServiceClient();

    const { data: subs } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (!subs?.length) return { sent, failed };

    let concurrency = 0;
    const MAX_CONCURRENT = 10;
    const promises: Promise<void>[] = [];

    for (const sub of subs as Array<{ endpoint: string; p256dh: string; auth: string }>) {
      const p = (async () => {
        const ok = await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          { title, body, url },
        );
        if (ok) sent++; else failed++;
      })();
      promises.push(p);
      concurrency++;
      if (concurrency >= MAX_CONCURRENT) {
        await Promise.race(promises);
        concurrency--;
      }
    }
    await Promise.allSettled(promises);
  } catch (err) {
    log.error('broadcastPush failed', { error: String(err) });
  }

  return { sent, failed };
}
