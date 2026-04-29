import { getChannelRouter } from './channels';
import type { Channel, NormalizedOutgoingMessage, SendResult } from './channels';
import { completeJob, failJob, type JobPayload, type JobQueueRow } from './job-queue';

const WORK_TYPE_LABELS: Record<string, string> = {
  labor: 'Рабочие / бригада',
  equipment: 'Техника',
  materials: 'Материалы',
  complex: 'Комплекс услуг',
  combo: 'Комбо-заказ',
};

const INITIATOR_LABELS: Record<string, string> = {
  customer: 'Заказчик',
  supplier: 'Исполнитель',
};

const RESOLUTION_LABELS: Record<string, string> = {
  refund_full: 'Полный возврат заказчику',
  release_payment: 'Выплата исполнителю',
};

function asString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function formatAmount(value: unknown, fallback = 'не указана'): string {
  return value != null && value !== ''
    ? `${Number(value).toLocaleString('ru-RU')} ₽`
    : fallback;
}

function workTypeLabel(value: unknown): string {
  const raw = asString(value);
  return WORK_TYPE_LABELS[raw] || raw || 'не указан';
}

function getAdminTelegramChatId(): string | null {
  return process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID || null;
}

function getAdminMessages(text: string): NormalizedOutgoingMessage[] {
  const messages: NormalizedOutgoingMessage[] = [];
  const telegramChatId = getAdminTelegramChatId();
  const maxAdminUserId = process.env.MAX_ADMIN_USER_ID;

  if (telegramChatId) {
    messages.push({
      channel: 'telegram',
      chat_id: telegramChatId,
      text,
    });
  }

  if (maxAdminUserId) {
    messages.push({
      channel: 'max',
      chat_id: maxAdminUserId,
      text,
    });
  }

  if (messages.length === 0) {
    throw new Error('No admin channels configured');
  }

  return messages;
}

async function sendOrThrow(messages: NormalizedOutgoingMessage[]): Promise<SendResult[]> {
  const router = getChannelRouter();
  const results = await Promise.all(messages.map((message) => router.send(message)));
  const failed = results.filter((result) => !result.success);
  if (failed.length > 0) {
    throw new Error(`Failed to deliver ${failed.length} message(s): ${failed.map((result) => result.error ?? result.channel).join('; ')}`);
  }
  return results;
}

function buildDisputeOpenedText(payload: JobPayload): string {
  const description = asString(payload.description).slice(0, 1000);
  const descriptionLine = description ? `\n💬 Описание: ${description}` : '';
  return `⚠️ *Открыт новый спор!*\n\n🆔 Заказ: ${asString(payload.order_id, '—')}\n🔖 Спор: ${asString(payload.dispute_id, '—')}\n👤 Инициатор: ${INITIATOR_LABELS[asString(payload.initiated_by)] || asString(payload.initiated_by, 'не указан')}\n📋 Причина: ${asString(payload.reason, 'не указана').slice(0, 500)}${descriptionLine}\n\n⚡ Требуется решение в админке: /admin → Споры`;
}

function buildDisputeResolvedText(payload: JobPayload): string {
  const resolution = asString(payload.resolution);
  return `✅ *Спор решён*\n\n🆔 Заказ: ${asString(payload.order_id, '—')}\n🔖 Спор: ${asString(payload.dispute_id, '—')}\n⚖️ Решение: ${RESOLUTION_LABELS[resolution] || resolution || 'не указано'}\n📞 Заказчик: ${asString(payload.customer_phone, '—')}\n📞 Исполнитель: ${asString(payload.executor_phone, '—')}\n🕒 Время: ${asString(payload.resolved_at, new Date().toISOString())}\n\n⚡ Свяжитесь с обеими сторонами для исполнения решения.`;
}

function buildPaymentHeldText(payload: JobPayload): string {
  return `💰 *Платёж удержан (escrow)*\n\n🆔 Заказ: ${asString(payload.order_id, '—')}\n👤 Клиент: ${asString(payload.customer_name, 'не указано')}\n📞 Тел: ${asString(payload.customer_phone, 'не указан')}\n🔨 Тип работ: ${workTypeLabel(payload.work_type)}\n📍 Адрес: ${asString(payload.address, 'не указан')}\n💵 Сумма: ${formatAmount(payload.amount)}\n🕒 Оплачено: ${asString(payload.paid_at, new Date().toISOString())}\n\n✅ Можно запускать работу.`;
}

function buildPayoutText(payload: JobPayload): string {
  return `✅ *Выплата исполнителю оформлена*\n\n🆔 Заказ: ${asString(payload.order_id, '—')}\n🔨 Тип работ: ${workTypeLabel(payload.work_type)}\n📞 Исполнитель: ${asString(payload.executor_phone, 'не указан')}\n💵 Сумма выплаты: ${formatAmount(payload.payout_amount)}\n🕒 Время: ${asString(payload.paid_at, new Date().toISOString())}`;
}

function buildPaymentLinkMessage(payload: JobPayload): { channel: Channel; chatId: string; text: string } | null {
  const preferredContact = asString(payload.preferred_contact).toLowerCase();
  const messengerId = asString(payload.messenger_id);
  const accessToken = asString(payload.access_token);
  const dashboardUrl = accessToken ? `https://podryad.pro/my/${accessToken}` : 'https://podryad.pro/my';
  const amountLine = payload.display_price != null ? `\n💰 Сумма: ${formatAmount(payload.display_price)}` : '';
  const orderLine = payload.order_id != null ? `\n🧾 Заказ: ${asString(payload.order_id)}` : '';
  const text = `💳 *Заказ готов к оплате*${orderLine}${amountLine}\n\n🔗 Личный кабинет: ${dashboardUrl}\n\nЕсли реквизиты СБП или счёт уже отправлены менеджером, после оплаты просто ответьте на это сообщение.`;

  if (preferredContact === 'max' && messengerId) {
    return { channel: 'max', chatId: messengerId, text };
  }

  if (preferredContact === 'telegram' && messengerId) {
    return { channel: 'telegram', chatId: messengerId, text };
  }

  return null;
}

async function handleAdminBroadcast(text: string): Promise<JobPayload> {
  const results = await sendOrThrow(getAdminMessages(text));
  return { delivered: results.length };
}

export async function handleJob(job: Pick<JobQueueRow, 'id' | 'job_type' | 'payload'>): Promise<JobPayload> {
  switch (job.job_type) {
    case 'dispute.opened':
      return handleAdminBroadcast(buildDisputeOpenedText(job.payload));

    case 'dispute.resolved':
      return handleAdminBroadcast(buildDisputeResolvedText(job.payload));

    case 'notify.payment_held':
      return handleAdminBroadcast(buildPaymentHeldText(job.payload));

    case 'notify.payout_initiated':
      return handleAdminBroadcast(buildPayoutText(job.payload));

    case 'customer.send_payment_link': {
      const delivery = buildPaymentLinkMessage(job.payload);
      if (delivery) {
        await sendOrThrow([{ channel: delivery.channel, chat_id: delivery.chatId, text: delivery.text }]);
        return { delivered: 1, channel: delivery.channel };
      }

      const adminChatId = getAdminTelegramChatId();
      if (!adminChatId) {
        throw new Error('Telegram admin chat is not configured for manual payment-link fallback');
      }

      const accessToken = asString(job.payload.access_token);
      const dashboardUrl = accessToken ? `https://podryad.pro/my/${accessToken}` : 'https://podryad.pro/my';
      const manualText = `📋 *Ручная отправка платёжной ссылки*\n\nЗаказ: ${asString(job.payload.order_id, '—')}\nСсылка: ${dashboardUrl}\n\nОтправьте клиенту ссылку вручную.`;
      await sendOrThrow([{ channel: 'telegram', chat_id: adminChatId, text: manualText }]);
      return { delivered: 1, manual: true };
    }

    default:
      throw new Error(`Unsupported job_type: ${job.job_type}`);
  }
}

export async function processClaimedJobs(jobs: JobQueueRow[]): Promise<{ completed: number; retried: number; dead: number; failed_job_ids: string[] }> {
  let completed = 0;
  let retried = 0;
  let dead = 0;
  const failedJobIds: string[] = [];

  for (const job of jobs) {
    try {
      const result = await handleJob(job);
      await completeJob(job.id, result);
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const state = await failJob(job, message);
      failedJobIds.push(job.id);
      if (state === 'dead') {
        dead += 1;
      } else {
        retried += 1;
      }
    }
  }

  return { completed, retried, dead, failed_job_ids: failedJobIds };
}