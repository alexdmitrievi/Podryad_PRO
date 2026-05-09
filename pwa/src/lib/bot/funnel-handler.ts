// Bot funnel event handler — processes callback_data and free-text in funnel context
// Called from both Telegram and MAX webhook handlers
import {
  getBotContact,
  getOrCreateSession,
  setSessionState,
  clearSession,
  createBotLead,
  computeDiscount,
  applyDiscountToLead,
  getMyBotOrders,
  getBotOrder,
  cancelBotOrder,
  updateBotOrderDate,
  repeatBotOrder,
  getPriceEstimate,
  getReferralLink,
  getReferralStats,
  recordReferralVisit,
  ensureReferralCode,
} from './index';
import {
  SERVICE_LABEL,
  UI,
  parseAreaBucket,
  whenLabelToRange,
  districtName,
  estimatePriceRange,
  applyDiscountToRange,
  formatRub,
  mapStatusToUi,
  canCancelStatus,
  canEditDateStatus,
} from './funnel-state';
import {
  mainMenuButtons,
  serviceSelectionButtons,
  areaButtons,
  districtButtons,
  whenButtons,
  confirmButtons,
  postOrderButtons,
  myOrdersButtons,
  orderCardButtons,
  referralButtons,
  backToHomeButton,
} from './keyboards';
import type { BotServiceKind, SessionState } from './types';
import type { MessageButton } from '@/lib/channels/types';
import { getChannelRouter } from '@/lib/channels';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

export type FunnelEvent = {
  type: 'message' | 'command' | 'callback';
  channel: 'telegram' | 'max';
  chatId: string;
  userId: string;
  text: string;
  updateId: string;
  username?: string;
  displayName?: string;
};

type FunnelResponse = {
  text: string;
  buttons?: MessageButton[][];
};

/** Main entry point — returns response if event was handled by funnel, null otherwise */
export async function handleFunnelEvent(event: FunnelEvent): Promise<FunnelResponse | null> {
  const { channel, chatId, userId, text, type } = event;
  const router = getChannelRouter();

  // Load or create bot contact
  let contact: { contactId: string; identityId: string; isNew: boolean } | null = null;
  try {
    contact = await getBotContact(channel, userId, event.username, event.displayName);
  } catch (err) {
    log.error('[funnel-handler] getBotContact failed', { error: String(err) });
    return null;
  }

  const { contactId } = contact;

  // Load session
  let session;
  try {
    session = await getOrCreateSession(chatId, channel, contactId);
  } catch {
    session = null;
  }

  const state: SessionState = (session?.state ?? {}) as SessionState;
  const screen = state.screen ?? 'home';

  // ── Handle callbacks (inline button clicks) ───────────────
  if (type === 'callback') {
    return handleCallback(text, contactId, chatId, channel, state, event);
  }

  // ── Handle commands ────────────────────────────────────────
  if (type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);

    // /start with ref_<code> (referral deep link)
    if (cmd === '/start' && args[0]?.startsWith('ref_')) {
      const code = args[0]!.slice(4);
      try {
        await recordReferralVisit(contactId, code);
        await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home', referredBy: code });
      } catch { /* ignore */ }
      return {
        text: UI.homeWelcome(event.displayName),
        buttons: mainMenuButtons(),
      };
    }

    // /start — always returns home with funnel menu
    if (cmd === '/start') {
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home' });
      return {
        text: UI.homeWelcome(event.displayName),
        buttons: mainMenuButtons(),
      };
    }

    // /cancel — cancel order flow
    if (cmd === '/cancel') {
      await clearSession(chatId, channel);
      return {
        text: '✅ Воронка отменена.\n\n' + UI.homeMenu,
        buttons: mainMenuButtons(),
      };
    }

    // If in a funnel, free-text might be a funnel answer (area, district, phone)
    if (screen === 'order') {
      return handleFunnelText(text, contactId, chatId, channel, state, event);
    }
  }

  // ── Free-text in funnel context ────────────────────────────
  if (type === 'message' && screen === 'order') {
    return handleFunnelText(text, contactId, chatId, channel, state, event);
  }

  // Not in funnel — return null (fall through to existing handler)
  return null;
}

/** Handle inline callback from funnel keyboards */
async function handleCallback(
  data: string,
  contactId: string,
  chatId: string,
  channel: 'telegram' | 'max',
  state: SessionState,
  event: FunnelEvent,
): Promise<FunnelResponse | null> {
  const router = getChannelRouter();
  const sendAck = async () => {
    try {
      if (channel === 'telegram') {
        await router.send({ channel: 'telegram', chat_id: chatId, text: '✓' });
      }
    } catch { /* ignore */ }
  };

  // ── Menu navigation ────────────────────────────────────────
  if (data.startsWith('menu:')) {
    const action = data.slice(5);
    switch (action) {
      case 'home': {
        await clearSession(chatId, channel);
        return { text: UI.homeMenu, buttons: mainMenuButtons() };
      }
      case 'order': {
        await setSessionState(chatId, channel, 'order', 'service', { screen: 'order' });
        return { text: 'Выберите услугу:', buttons: serviceSelectionButtons() };
      }
      case 'my_orders': {
        await setSessionState(chatId, channel, 'orders', 'list', { screen: 'orders' });
        const orders = await getMyBotOrders(contactId);
        if (orders.length === 0) {
          const bb: MessageButton = { type: 'callback', text: '🚀 Заказать', callback_data: 'menu:order' };
          return { text: UI.myOrdersEmpty, buttons: [[bb]] };
        }
        return { text: '📋 <b>Мои заказы</b>', buttons: myOrdersButtons(orders as Array<{ id: string; human_id?: string; service_short?: string; status?: string }>) };
      }
      case 'referral': {
        await setSessionState(chatId, channel, 'referral', 'main', { screen: 'referral' });
        try {
          const link = await getReferralLink(contactId, 'PodraydPRO_bot');
          const stats = await getReferralStats(contactId);
          return { text: UI.referralIntro({ link, invited: stats.invited, balance: stats.balance }), buttons: referralButtons() };
        } catch {
          return { text: 'Что-то пошло не так. Попробуйте позже.', buttons: mainMenuButtons() };
        }
      }
      case 'referral_list': {
        // Simplified — just back to main
        return { text: '👥 Список ваших рефералов будет доступен в ближайшее время.', buttons: backToHomeButton() };
      }
      case 'help': {
        return { text: UI.helpText, buttons: backToHomeButton() };
      }
      default:
        return null;
    }
  }

  // ── Service selection ──────────────────────────────────────
  if (data.startsWith('svc:')) {
    const kind = data.slice(4) as BotServiceKind;
    const label = SERVICE_LABEL[kind];

    const areasNeeded = ['lawn_mowing', 'scarification', 'aeration', 'land_clearing', 'weed_removal', 'tilling'].includes(kind);

    if (areasNeeded) {
      await setSessionState(chatId, channel, 'order', 'params', {
        ...state, screen: 'order', serviceKind: kind,
      });
      return {
        text: `<b>${label}</b>\n\nОцените площадь участка:`,
        buttons: areaButtons(kind),
      };
    }

    // Services that skip area — go straight to district
    await setSessionState(chatId, channel, 'order', 'district', {
      ...state, screen: 'order', serviceKind: kind, area: 1, areaUnit: 'шт',
    });
    return {
      text: UI.askDistrict,
      buttons: districtButtons(),
    };
  }

  // ── Area selection ────────────────────────────────────────
  if (data.startsWith('area:')) {
    const parsed = parseAreaBucket(data);
    if (!parsed) {
      // Custom area — ask for text input
      await setSessionState(chatId, channel, 'order', 'params', {
        ...state, screen: 'order',
      });
      return { text: 'Напишите точную площадь в сотках (например, «15» или «3.5»):' };
    }

    const avgArea = Math.round((parsed.min + parsed.max) / 2) || parsed.max;
    await setSessionState(chatId, channel, 'order', 'district', {
      ...state, screen: 'order', area: avgArea, areaUnit: parsed.unit, areaBucket: parsed.bucket,
    });
    return {
      text: UI.askDistrict,
      buttons: districtButtons(),
    };
  }

  // ── District selection ─────────────────────────────────────
  if (data.startsWith('district:')) {
    const code = data.slice(9);
    const name = districtName(code) ?? code;
    await setSessionState(chatId, channel, 'order', 'when', {
      ...state, screen: 'order', district: name, districtCode: code,
    });
    return {
      text: UI.askWhen,
      buttons: whenButtons(),
    };
  }

  // ── When selection ─────────────────────────────────────────
  if (data.startsWith('when:')) {
    const label = data.slice(5);
    if (label === 'custom') {
      await setSessionState(chatId, channel, 'order', 'when', { ...state, screen: 'order' });
      return { text: 'Напишите удобную дату (например, «15 мая» или «20.05»):' };
    }

    const range = whenLabelToRange(label);
    if (!range) return null;

    // Move to confirm
    const sk = state.serviceKind!;
    const area = state.area || 1;
    const price = await getPriceEstimate(sk, area);

    // Compute discount
    let discountPercent = 0;
    let bonusRub = 0;
    try {
      const d = await computeDiscount(contactId);
      discountPercent = d.percent;
      bonusRub = d.bonusRub;
    } catch { /* ignore */ }

    const final = applyDiscountToRange(price, discountPercent, Math.min(bonusRub, 500));

    await setSessionState(chatId, channel, 'order', 'confirm', {
      ...state, screen: 'order',
      whenLabel: label,
      whenHuman: range.human,
      whenFrom: range.from,
      whenTo: range.to,
      discountPercent,
      bonusRub: Math.min(bonusRub, 500),
    });

    return {
      text: UI.confirm({
        service: SERVICE_LABEL[sk],
        area: state.areaBucket
          ? `${state.areaBucket === '5' ? 'до 5' : state.areaBucket === '10' ? '5–10' : state.areaBucket === '20' ? '10–20' : '20+'} соток`
          : `${area} ${state.areaUnit ?? 'сотка'}`,
        district: state.district,
        when: range.human,
        priceLow: price.low,
        priceHigh: price.high,
        discountPercent,
        bonusRub,
        finalLow: final.low,
        finalHigh: final.high,
      }),
      buttons: confirmButtons(),
    };
  }

  // ── Confirm ─────────────────────────────────────────────────
  if (data.startsWith('confirm:')) {
    const action = data.slice(8);

    if (action === 'yes') {
      await sendAck();
      const sk = state.serviceKind!;

      // Create the lead
      const area = state.area || 1;
      const price = await getPriceEstimate(sk, area);
      const discountPercent = state.discountPercent || 0;
      const bonusRub = state.bonusRub || 0;

      const leadId = await createBotLead({
        contactId, serviceKind: sk, channel,
        description: state.description,
        areaValue: area, areaUnit: state.areaUnit ?? 'сотка',
        district: state.district,
        discountPercent,
        discountRub: 0,
      });

      // Apply discount
      try {
        await applyDiscountToLead(contactId, leadId, discountPercent, bonusRub);
      } catch { /* ignore */ }

      const humanId = `B-${leadId.slice(0, 6).toUpperCase()}`;

      // Enqueue notification job
      void enqueueJob({
        queueName: 'leads',
        jobType: 'bot.lead_created',
        dedupeKey: `bot:${leadId}`,
        payload: {
          contact_id: contactId,
          lead_id: leadId,
          service_kind: sk,
          channel,
          district: state.district,
          when: state.whenHuman,
        },
      }).catch(() => {});

      await clearSession(chatId, channel);

      return {
        text: UI.thanks({ humanId, service: SERVICE_LABEL[sk], when: state.whenHuman, district: state.district }),
        buttons: postOrderButtons(),
      };
    }

    if (action === 'cancel') {
      await clearSession(chatId, channel);
      return { text: '❌ Заказ отменён.\n\n' + UI.homeMenu, buttons: mainMenuButtons() };
    }

    if (action === 'edit') {
      // Restart from service selection
      await setSessionState(chatId, channel, 'order', 'service', { screen: 'order' });
      return { text: 'Выберите услугу заново:', buttons: serviceSelectionButtons() };
    }

    return null;
  }

  // ── My Orders / Order card ──────────────────────────────────
  if (data.startsWith('order:')) {
    const parts = data.slice(6).split(':');
    const leadId = parts[0]!;
    const action = parts[1]!;

    if (action === 'view') {
      const order = await getBotOrder(contactId, leadId);
      if (!order) return { text: 'Заказ не найден.', buttons: backToHomeButton() };

      const si = mapStatusToUi(String(order.status ?? 'new'));
      return {
        text: UI.orderCard({
          humanId: `B-${leadId.slice(0, 6).toUpperCase()}`,
          serviceName: String(order.service_name ?? ''),
          statusIcon: si.icon,
          statusLabel: si.label,
          when: order.desired_date_from ? String(order.desired_date_from) : undefined,
          district: order.district ? String(order.district) : undefined,
          area: order.area_value ? `${order.area_value} ${order.area_unit ?? ''}` : undefined,
          priceQuoted: order.price_final ? Number(order.price_final) : undefined,
          discountPercent: order.discount_percent ? Number(order.discount_percent) : undefined,
        }),
        buttons: orderCardButtons(leadId, String(order.status ?? 'new')),
      };
    }

    if (action === 'repeat') {
      await setSessionState(chatId, channel, 'repeat', 'when', {
        ...state, screen: 'repeat', activeLeadId: leadId,
      });
      return {
        text: '📅 На когда повторить заказ?',
        buttons: whenButtons(),
      };
    }

    if (action === 'edit_date') {
      await setSessionState(chatId, channel, 'edit_date', 'when', {
        ...state, screen: 'edit_date', activeLeadId: leadId,
      });
      return {
        text: '📅 Выберите новую дату:',
        buttons: whenButtons(),
      };
    }

    if (action === 'cancel') {
      const ok = await cancelBotOrder(contactId, leadId);
      return {
        text: ok ? '✅ Заказ отменён.' : '❌ Не удалось отменить заказ.',
        buttons: mainMenuButtons(),
      };
    }
  }

  // ── Funnel back button ─────────────────────────────────────
  if (data === 'funnel:back') {
    await setSessionState(chatId, channel, 'order', 'service', { ...state, screen: 'order' });
    return { text: 'Выберите услугу:', buttons: serviceSelectionButtons() };
  }

  return null;
}

/** Handle free-text input during funnel (area number, custom date, phone, etc.) */
async function handleFunnelText(
  text: string,
  contactId: string,
  chatId: string,
  channel: 'telegram' | 'max',
  state: SessionState,
  event: FunnelEvent,
): Promise<FunnelResponse | null> {
  const numMatch = text.match(/^(\d+(?:[.,]\d+)?)$/);

  // In params step — parse area number
  if (state.screen === 'order' && !state.area) {
    if (numMatch) {
      const area = parseFloat(numMatch[1]!.replace(',', '.'));
      await setSessionState(chatId, channel, 'order', 'district', {
        ...state, screen: 'order', area, areaUnit: 'сотка', areaBucket: `${area}`,
      });
      return {
        text: UI.askDistrict,
        buttons: districtButtons(),
      };
    }
    return { text: 'Пожалуйста, укажите площадь числом (например, «15» или «3.5»).' };
  }

  // In when step — parse custom date
  if (state.screen === 'order' && !state.whenLabel) {
    const sk = state.serviceKind!;
    const area = state.area || 1;
    const price = await getPriceEstimate(sk, area);

    await setSessionState(chatId, channel, 'order', 'confirm', {
      ...state, screen: 'order',
      whenLabel: 'custom', whenCustom: text, whenHuman: text,
      whenFrom: text, whenTo: text,
    });

    return {
      text: UI.confirm({
        service: SERVICE_LABEL[sk],
        area: `${area} ${state.areaUnit ?? 'сотка'}`,
        district: state.district,
        when: text,
        priceLow: price.low,
        priceHigh: price.high,
      }),
      buttons: confirmButtons(),
    };
  }

  // In repeat/edit_date step — date input
  if ((state.screen === 'repeat' || state.screen === 'edit_date') && state.activeLeadId) {
    const whenLabel = 'custom';
    const range = { from: text, to: text, human: text };

    if (state.screen === 'repeat') {
      try {
        const result = await repeatBotOrder(contactId, state.activeLeadId, channel, range);
        const humanId = `B-${result.newLeadId.slice(0, 6).toUpperCase()}`;
        await clearSession(chatId, channel);
        return {
          text: `✅ <b>Повторный заказ #${humanId}</b>\n\n` +
            `Услуга: ${String(result.oldOrder.service_name ?? '')}\nКогда: ${text}\n\nМастер свяжется в течение 30 минут.`,
          buttons: postOrderButtons(),
        };
      } catch (err) {
        log.error('[funnel-handler] repeatOrder failed', { error: String(err) });
        return { text: '❌ Не удалось создать повторный заказ.', buttons: mainMenuButtons() };
      }
    }

    if (state.screen === 'edit_date') {
      try {
        await updateBotOrderDate(contactId, state.activeLeadId, text, text);
        await clearSession(chatId, channel);
        return {
          text: `✅ Дата заказа изменена на ${text}.`,
          buttons: mainMenuButtons(),
        };
      } catch {
        return { text: '❌ Не удалось изменить дату.', buttons: mainMenuButtons() };
      }
    }
  }

  return null;
}
