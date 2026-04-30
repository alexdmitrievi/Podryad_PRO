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

function buildOrderCreatedText(payload: JobPayload): string {
  const nameLine = payload.customer_name ? `\n👤 Клиент: ${asString(payload.customer_name)}` : '';
  return `🆕 *Новый заказ*\n\n🆔 Заказ: ${asString(payload.order_id, '—')}\n📞 Телефон: ${asString(payload.phone, '—')}${nameLine}\n🔨 Тип работ: ${workTypeLabel(payload.work_type)}\n📍 Адрес: ${asString(payload.address, '—')}\n📅 Дата: ${asString(payload.work_date, '—')}\n\n⚡ /admin → Заказы`;
}

function buildLeadCreatedText(payload: JobPayload): string {
  const nameLine = payload.name ? `\n👤 Имя: ${asString(payload.name)}` : '';
  const source = asString(payload.source, 'landing');
  const comment = asString(payload.comment).slice(0, 400);
  const commentLine = comment ? `\n💬 ${comment}` : '';
  const orderType = asString((payload.order_type ?? payload.type ?? '') as string, '');
  const typeLabel = workTypeLabel(payload.work_type) || orderType || '—';
  return `📥 *Новая заявка (${source})*\n\n📞 Телефон: ${asString(payload.phone, '—')}${nameLine}\n🔨 Тип: ${typeLabel}\n📍 Адрес: ${asString(payload.address, '—')}${commentLine}\n\n⚡ /admin → Лиды`;
}

function buildExecutorResponseText(payload: JobPayload): string {
  const comment = asString(payload.comment).slice(0, 400);
  const commentLine = comment ? `\n💬 Комментарий: ${comment}` : '';
  const priceLine = payload.price != null ? `\n💰 Цена: ${formatAmount(payload.price)}` : '';
  return `🤝 *Отклик исполнителя*\n\n🆔 Заказ: ${asString(payload.order_id, '—')}\n👤 Имя: ${asString(payload.name, '—')}\n📞 Телефон: ${asString(payload.phone, '—')}${priceLine}${commentLine}\n\n⚡ /admin → Заказы → Отклики`;
}

function buildContractorRegisteredText(payload: JobPayload): string {
  const specialties = Array.isArray(payload.specialties)
    ? (payload.specialties as string[]).join(', ')
    : asString(payload.specialties, '—');
  const brigadeLine = payload.is_brigade ? `\n👥 Бригада: ${payload.crew_size ?? '?'} чел.` : '';
  return `🔧 *Новый исполнитель*\n\n🆔 ID: ${asString(payload.contractor_id, '—')}\n👤 Имя: ${asString(payload.name, '—')}\n📞 Телефон: ${asString(payload.phone, '—')}\n📍 Город: ${asString(payload.city, '—')}\n🛠️ Специализации: ${specialties}${brigadeLine}\n\n⚡ /admin → Исполнители`;
}

function buildDashboardLinkMessage(payload: JobPayload): { channel: Channel; chatId: string; text: string } | null {
  const preferredContact = asString(payload.preferred_contact).toLowerCase();
  const messengerId = asString(payload.messenger_id);
  const accessToken = asString(payload.access_token);
  const dashboardUrl = accessToken ? `https://podryad.pro/my/${accessToken}` : 'https://podryad.pro/my';
  const text = `🔗 *Ваш личный кабинет*\n\n${dashboardUrl}\n\nПросмотр заказа, статус оплаты и все детали — по ссылке выше.`;
  if (preferredContact === 'max' && messengerId) return { channel: 'max', chatId: messengerId, text };
  if (preferredContact === 'telegram' && messengerId) return { channel: 'telegram', chatId: messengerId, text };
  return null;
}

function buildInvoiceMessage(payload: JobPayload): { channel: Channel; chatId: string; text: string } | null {
  const preferredContact = asString(payload.preferred_contact).toLowerCase();
  const messengerId = asString(payload.messenger_id);
  if (!messengerId) return null;
  const amountLine = payload.amount != null ? `\n💰 Сумма: ${formatAmount(payload.amount)}` : '';
  const orderNumber = asString((payload.order_number ?? payload.order_id ?? '') as string, '—');
  const customerTypeLabel = asString(payload.customer_type, 'individual') === 'legal_entity' ? 'юр. лицо' : 'физ. лицо';
  const text = `🧾 *Счёт для оплаты*\n\n🔖 Заказ: ${orderNumber}\n👤 Форма: ${customerTypeLabel}${amountLine}\n\nМенеджер пришлёт реквизиты для оплаты в ближайшее время.`;
  if (preferredContact === 'max' && messengerId) return { channel: 'max', chatId: messengerId, text };
  if (preferredContact === 'telegram' && messengerId) return { channel: 'telegram', chatId: messengerId, text };
  return null;
}

function buildProspectStageText(payload: JobPayload): string {
  const action = asString(payload.action);
  const prospect = (payload.prospect as Record<string, unknown>) ?? {};
  if (action === 'prospect_added') {
    return `👤 *Новый prospect*\n\n🆔 ID: ${asString(prospect.id, '—')}\n👤 Имя: ${asString(prospect.name, '—')}\n📞 Телефон: ${asString(prospect.phone, '—')}\n🏙️ Город: ${asString(prospect.city, '—')}\n📋 Стадия: ${asString(prospect.stage, '—')}\n\n⚡ /admin → CRM → Prospects`;
  }
  const previousStage = asString(payload.previous_stage, '—');
  return `🔄 *Prospect: смена стадии*\n\n🆔 ID: ${asString(prospect.id, '—')}\n👤 Имя: ${asString(prospect.name, '—')}\n📞 Телефон: ${asString(prospect.phone, '—')}\n\n${previousStage} → ${asString(prospect.stage, '—')}\n\n⚡ /admin → CRM → Prospects`;
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
    case 'notify.order_created':
      return handleAdminBroadcast(buildOrderCreatedText(job.payload));

    case 'notify.lead_created':
      return handleAdminBroadcast(buildLeadCreatedText(job.payload));

    case 'notify.executor_response_received':
      return handleAdminBroadcast(buildExecutorResponseText(job.payload));

    case 'notify.contractor_registered':
      return handleAdminBroadcast(buildContractorRegisteredText(job.payload));

    case 'crm.prospect_stage_event':
      return handleAdminBroadcast(buildProspectStageText(job.payload));

    case 'customer.send_dashboard_link': {
      const delivery = buildDashboardLinkMessage(job.payload);
      if (delivery) {
        await sendOrThrow([{ channel: delivery.channel, chat_id: delivery.chatId, text: delivery.text }]);
        return { delivered: 1, channel: delivery.channel };
      }
      const adminChatId = getAdminTelegramChatId();
      if (!adminChatId) throw new Error('No admin channel configured for dashboard-link fallback');
      const phone = asString(job.payload.phone, '—');
      const accessToken = asString(job.payload.access_token);
      const dashboardUrl = accessToken ? `https://podryad.pro/my/${accessToken}` : 'https://podryad.pro/my';
      const manualText = `📋 *Ручная отправка ссылки на кабинет*\n\nТелефон: ${phone}\nСсылка: ${dashboardUrl}\n\nОтправьте клиенту ссылку вручную.`;
      await sendOrThrow([{ channel: 'telegram', chat_id: adminChatId, text: manualText }]);
      return { delivered: 1, manual: true };
    }

    case 'customer.send_invoice': {
      const delivery = buildInvoiceMessage(job.payload);
      if (delivery) {
        await sendOrThrow([{ channel: delivery.channel, chat_id: delivery.chatId, text: delivery.text }]);
        return { delivered: 1, channel: delivery.channel };
      }
      const adminChatId = getAdminTelegramChatId();
      if (!adminChatId) throw new Error('No admin channel configured for send-invoice fallback');
      const orderNumber = asString((job.payload.order_number ?? job.payload.order_id ?? '') as string, '—');
      const customerPhone = asString(job.payload.customer_phone, '—');
      const customerTypeLabel = asString(job.payload.customer_type, 'individual') === 'legal_entity' ? 'юр. лицо' : 'физ. лицо';
      const amountLine = job.payload.amount != null ? `, ${formatAmount(job.payload.amount)}` : '';
      const manualText = `📋 *Отправьте счёт вручную*\n\nЗаказ: ${orderNumber} (${customerTypeLabel}${amountLine})\nТелефон: ${customerPhone}\n\nОтправьте реквизиты клиенту.`;
      await sendOrThrow([{ channel: 'telegram', chat_id: adminChatId, text: manualText }]);
      return { delivered: 1, manual: true };
    }

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