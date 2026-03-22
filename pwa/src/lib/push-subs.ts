import { getServiceClient } from './supabase';
import type { PushSubscriptionData } from './push';

/** Нет SUPABASE_SERVICE_ROLE_KEY или клиент не создан. */
export const PUSH_STORAGE_NOT_CONFIGURED = 'PUSH_STORAGE_NOT_CONFIGURED';

function db() {
  try {
    return getServiceClient();
  } catch {
    throw new Error(PUSH_STORAGE_NOT_CONFIGURED);
  }
}

function phoneDigits(p: string): string {
  return p.replace(/\D/g, '');
}

interface Row {
  id: string;
  user_id: string;
  phone: string;
  role: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  is_active: boolean;
}

function rowToSubscription(r: Row): PushSubscriptionData {
  return { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
}

/** Сохранить подписку (вставка или обновление по endpoint). */
export async function savePushSubscription(
  userId: string,
  phone: string,
  role: string,
  subscription: PushSubscriptionData
): Promise<void> {
  const { error } = await db()
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        phone,
        role,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        is_active: true,
      },
      { onConflict: 'endpoint' }
    );
  if (error) {
    console.error('push_subscriptions upsert:', error);
    throw new Error('PUSHSUBS_WRITE_FAILED');
  }
}

/** Найти подписки по user_id */
export async function findPushSubscriptions(
  userId: string
): Promise<PushSubscriptionData[]> {
  const { data, error } = await db()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) {
    console.error('push_subscriptions read:', error);
    return [];
  }
  return (data || []).map((r) => rowToSubscription(r as Row));
}

/** Найти подписки по телефону */
export async function findPushSubscriptionsByPhone(
  phone: string
): Promise<PushSubscriptionData[]> {
  const digits = phoneDigits(phone);
  if (!digits) return [];
  const { data, error } = await db()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('phone', digits)
    .eq('is_active', true);
  if (error) {
    console.error('push_subscriptions read:', error);
    return [];
  }
  return (data || []).map((r) => rowToSubscription(r as Row));
}

/** Найти подписки по роли */
export async function findPushSubscriptionsByRole(
  role: string
): Promise<PushSubscriptionData[]> {
  const { data, error } = await db()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('role', role)
    .eq('is_active', true);
  if (error) {
    console.error('push_subscriptions read:', error);
    return [];
  }
  return (data || []).map((r) => rowToSubscription(r as Row));
}

/** Подписки для рассылки с привязкой к user_id (для деактивации при 410). */
export async function listPushSubscriptionsForSend(filter: {
  userId?: string;
  phone?: string;
  role?: string;
}): Promise<Array<{ userId: string; subscription: PushSubscriptionData }>> {
  let query = db()
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .eq('is_active', true);

  if (filter.userId !== undefined) {
    query = query.eq('user_id', filter.userId);
  } else if (filter.phone !== undefined) {
    const digits = phoneDigits(filter.phone);
    if (!digits) return [];
    query = query.eq('phone', digits);
  } else if (filter.role !== undefined) {
    query = query.eq('role', filter.role);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) {
    console.error('push_subscriptions read:', error);
    return [];
  }

  const seen = new Set<string>();
  const out: Array<{ userId: string; subscription: PushSubscriptionData }> = [];
  for (const r of (data || []) as Row[]) {
    if (seen.has(r.endpoint)) continue;
    seen.add(r.endpoint);
    out.push({
      userId: r.user_id,
      subscription: { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
    });
  }
  return out;
}

/** Деактивировать подписку по endpoint и user_id */
export async function deactivatePushSubscription(
  endpoint: string,
  userId: string
): Promise<void> {
  const { error } = await db()
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('endpoint', endpoint)
    .eq('user_id', userId);
  if (error) {
    console.error('push_subscriptions deactivate:', error);
    throw new Error('PUSHSUBS_WRITE_FAILED');
  }
}
