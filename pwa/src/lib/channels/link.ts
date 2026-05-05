import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

const db = () => getServiceClient();

type MessengerChannel = 'telegram' | 'max' | 'avito';

/** Normalize Russian phone number to digits only (e.g. "+7 962 123-45-67" → "79621234567") */
function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

/** Basic phone validation — Russian mobile numbers: 11 digits starting with 7 or 8 */
function isValidPhone(digits: string): boolean {
  return /^[78]\d{10}$/.test(digits);
}

/**
 * Link a messenger account to a customer or contractor by phone.
 * Updates customer_tokens (messenger_id + preferred_contact) and contractors table.
 */
export async function linkMessengerAccount(params: {
  channel: MessengerChannel;
  userId: string;
  rawPhone: string;
}): Promise<{ ok: boolean; message: string }> {
  const { channel, userId, rawPhone } = params;
  const phone = normalizePhone(rawPhone);

  if (!isValidPhone(phone)) {
    return {
      ok: false,
      message: 'Неверный формат номера. Отправьте: /link +79621234567',
    };
  }

  const channelLabels: Record<MessengerChannel, string> = { telegram: 'Telegram', max: 'MAX', avito: 'Avito' };
  const channelLabel = channelLabels[channel];

  try {

    // 1. Upsert customer_tokens — link messenger_id + set preferred_contact
    const { data: existingToken } = await db()
      .from('customer_tokens')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle();

    if (existingToken) {
      await db()
        .from('customer_tokens')
        .update({
          messenger_id: userId,
          preferred_contact: channel,
        })
        .eq('phone', phone);
    } else {
      await db()
        .from('customer_tokens')
        .insert({
          phone,
          messenger_id: userId,
          preferred_contact: channel,
        });
    }

    // 2. Also update contractors table if this phone is a registered contractor
    const idFields: Record<MessengerChannel, string | null> = { telegram: 'telegram_id', max: 'max_id', avito: null };
    const idField = idFields[channel];
    if (idField) {
      const { data: contractor } = await db()
        .from('contractors')
        .select('id, phone')
        .eq('phone', phone)
        .maybeSingle();

      if (contractor) {
        await db()
          .from('contractors')
          .update({ [idField]: userId })
          .eq('phone', phone);
      }
    }

    log.info('[linkMessengerAccount] Linked', { channel, phone, user_id: userId });
    return {
      ok: true,
      message: `✅ Ваш ${channelLabel} привязан к номеру ${phone}.\nТеперь вы будете получать уведомления о заказах прямо сюда.`,
    };
  } catch (err) {
    log.error('[linkMessengerAccount] Failed', { error: String(err), channel, phone });
    return {
      ok: false,
      message: 'Произошла ошибка при привязке. Попробуйте позже или свяжитесь с нами через сайт.',
    };
  }
}

/**
 * Look up a user's phone by their messenger user ID.
 * Checks customer_tokens.messenger_id and contractors.{telegram_id|max_id}.
 */
export async function getPhoneByMessengerId(params: {
  channel: MessengerChannel;
  userId: string;
}): Promise<string | null> {
  const { channel, userId } = params;

  try {
    // Check customer_tokens.messenger_id (generic field)
    const { data: token } = await db()
      .from('customer_tokens')
      .select('phone')
      .eq('messenger_id', userId)
      .maybeSingle();

    if (token?.phone) return String(token.phone);

    // Check contractors table — channel-specific column (avito has no dedicated column)
    if (channel !== 'avito') {
      const idField = channel === 'telegram' ? 'telegram_id' : 'max_id';
      const { data: contractor } = await db()
        .from('contractors')
        .select('phone')
        .eq(idField, userId)
        .maybeSingle();

      if (contractor?.phone) return String(contractor.phone);
    }

    return null;
  } catch (err) {
    log.error('[getPhoneByMessengerId] Failed', { error: String(err), channel, user_id: userId });
    return null;
  }
}

/**
 * Get recent orders for a user identified by messenger ID.
 */
export async function getOrdersByMessengerId(params: {
  channel: MessengerChannel;
  userId: string;
}): Promise<Array<Record<string, unknown>>> {
  const phone = await getPhoneByMessengerId(params);
  if (!phone) return [];

  const { data: orders, error } = await db()
    .from('orders')
    .select('order_id, order_number, status, work_type, display_price, created_at, customer_comment')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    log.error('[getOrdersByMessengerId] Query failed', { error: String(error) });
    return [];
  }

  return orders ?? [];
}

/** Russian labels for order statuses */
const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Ожидает оценки',
  priced: '💰 Оценён',
  payment_sent: '💳 Ожидает оплаты',
  paid: '✅ Оплачен',
  in_progress: '🔨 В работе',
  confirming: '🤝 Подтверждение',
  completed: '🏁 Завершён',
  cancelled: '❌ Отменён',
  disputed: '⚠️ Спор',
  published: '📢 Опубликован',
  closed: '📁 Закрыт',
};

export function formatOrderStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
