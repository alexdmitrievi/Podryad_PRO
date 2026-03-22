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

function rowToParsed(r: Row) {
  return {
    id: r.id,
    userId: r.user_id,
    phone: r.phone,
    role: r.role,
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth },
    isActive: r.is_active,
  };
}

async function fetchAllRows(): Promise<ReturnType<typeof rowToParsed>[]> {
  const { data, error } = await db()
    .from('push_subscriptions')
    .select('id, user_id, phone, role, endpoint, p256dh, auth, is_active');
  if (error) {
    console.error('push_subscriptions read:', error);
    throw new Error('PUSHSUBS_READ_FAILED');
  }
  return (data || []).map((r) => rowToParsed(r as Row));
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
  const all = await fetchAllRows();
  return all
    .filter((r) => r.userId === userId && r.isActive)
    .map((r) => ({
      endpoint: r.endpoint,
      keys: r.keys,
    }));
}

/** Найти подписки по телефону */
export async function findPushSubscriptionsByPhone(
  phone: string
): Promise<PushSubscriptionData[]> {
  const digits = phoneDigits(phone);
  const all = await fetchAllRows();
  return all
    .filter(
      (r) => r.isActive && digits.length > 0 && phoneDigits(r.phone) === digits
    )
    .map((r) => ({
      endpoint: r.endpoint,
      keys: r.keys,
    }));
}

/** Найти подписки по роли */
export async function findPushSubscriptionsByRole(
  role: string
): Promise<PushSubscriptionData[]> {
  const all = await fetchAllRows();
  return all
    .filter((r) => r.isActive && r.role === role)
    .map((r) => ({
      endpoint: r.endpoint,
      keys: r.keys,
    }));
}

/** Подписки для рассылки с привязкой к user_id (для деактивации при 410). */
export async function listPushSubscriptionsForSend(filter: {
  userId?: string;
  phone?: string;
  role?: string;
}): Promise<Array<{ userId: string; subscription: PushSubscriptionData }>> {
  const all = await fetchAllRows();
  const digits = filter.phone ? phoneDigits(filter.phone) : '';

  const matched = all.filter((r) => {
    if (!r.isActive) return false;
    if (filter.userId !== undefined) return r.userId === filter.userId;
    if (filter.phone !== undefined) {
      return digits.length > 0 && phoneDigits(r.phone) === digits;
    }
    if (filter.role !== undefined) return r.role === filter.role;
    return false;
  });

  const seen = new Set<string>();
  const out: Array<{ userId: string; subscription: PushSubscriptionData }> = [];
  for (const r of matched) {
    if (seen.has(r.endpoint)) continue;
    seen.add(r.endpoint);
    out.push({
      userId: r.userId,
      subscription: { endpoint: r.endpoint, keys: r.keys },
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
