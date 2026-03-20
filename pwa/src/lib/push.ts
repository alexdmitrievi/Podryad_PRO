import webPush from 'web-push';

// Инициализация (серверная сторона)
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@podryad.pro';

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
      { TTL: 60 * 60 * 24 } // 24 часа
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

    // 410 Gone = подписка недействительна, нужно удалить
    if (statusCode === 410 || statusCode === 404) {
      console.log(
        'Push subscription expired:',
        subscription.endpoint.slice(-20)
      );
      return false; // Вызывающий код должен удалить подписку
    }
    console.error('Push error:', message);
    return false;
  }
}
