// Bot funnel event handler — processes callback_data and free-text in funnel context
import {
  getBotContact, getOrCreateSession, setSessionState, clearSession,
  createBotLead, computeDiscount, applyDiscountToLead,
  getMyBotOrders, getBotOrder, cancelBotOrder, updateBotOrderDate, repeatBotOrder,
  getPriceEstimate, getReferralLink, getReferralStats, recordReferralVisit, ensureReferralCode,
} from './index';
import { createMaterialOrder } from './order-flow';
import {
  SERVICE_LABEL, REGION_LABEL, MATERIAL_LABEL, MATERIAL_GRADES, MATERIAL_UNIT, MATERIAL_PRICE_RANGE,
  UI, parseAreaBucket, whenLabelToRange, districtName, estimatePriceRange,
  applyDiscountToRange, formatRub, mapStatusToUi,
} from './funnel-state';
import {
  mainMenuButtons, mainMenuB2bButtons, customerTypeButtons, regionButtons,
  serviceSelectionButtons, areaButtons, districtButtons, whenButtons, confirmButtons,
  postOrderButtons, myOrdersButtons, orderCardButtons, referralButtons, backToHomeButton,
  materialsMenuButtons, gradeButtons, materialQtyButtons,
} from './keyboards';
import type { BotServiceKind, MaterialKind, RegionCode, CustomerType, SessionState } from './types';
import type { MessageButton } from '@/lib/channels/types';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';

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

type FunnelResponse = { text: string; buttons?: MessageButton[][] };

/** Main entry point */
export async function handleFunnelEvent(event: FunnelEvent): Promise<FunnelResponse | null> {
  const { channel, chatId, userId, text, type } = event;

  let contact: { contactId: string; identityId: string; isNew: boolean } | null = null;
  try {
    contact = await getBotContact(channel, userId, event.username, event.displayName);
  } catch (err) {
    log.error('[funnel-handler] getBotContact failed', { error: String(err) });
    return null;
  }
  const { contactId } = contact;

  let session;
  try { session = await getOrCreateSession(chatId, channel, contactId); } catch { session = null; }

  const state: SessionState = (session?.state ?? {}) as SessionState;
  const screen = state.screen ?? 'home';

  // ── Handle callbacks ──
  if (type === 'callback') {
    return handleCallback(text, contactId, chatId, channel, state, event, contact.isNew);
  }

  // ── Handle commands ──
  if (type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);

    if (cmd === '/start' && args[0]?.startsWith('ref_')) {
      const code = args[0]!.slice(4);
      try { await recordReferralVisit(contactId, code); } catch { /* ok */ }
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home', referredBy: code });
      return customerTypeOrHome(state, contact.isNew, event.displayName);
    }

    if (cmd === '/start') {
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home' });
      return customerTypeOrHome(state, contact.isNew, event.displayName);
    }

    if (cmd === '/cancel') {
      await clearSession(chatId, channel);
      return { text: '✅ Отменено.\n\n' + UI.homeMenu, buttons: mainMenuButtons() };
    }

    if (screen === 'order') {
      return handleFunnelText(text, contactId, chatId, channel, state, event);
    }
    if (screen === 'material_order') {
      return handleMaterialText(text, contactId, chatId, channel, state);
    }
  }

  if (type === 'message' && screen === 'order') {
    return handleFunnelText(text, contactId, chatId, channel, state, event);
  }
  if (type === 'message' && screen === 'material_order') {
    return handleMaterialText(text, contactId, chatId, channel, state);
  }

  return null;
}

/** If customer type not set, show picker; otherwise main menu */
function customerTypeOrHome(state: SessionState, isNew: boolean, displayName?: string): FunnelResponse {
  if (!state.customerType) {
    return { text: UI.askCustomerType(displayName), buttons: customerTypeButtons() };
  }
  const menu = state.customerType === 'b2b' ? mainMenuB2bButtons() : mainMenuButtons();
  return { text: UI.homeWelcome(displayName), buttons: menu };
}

/** Handle inline callbacks */
async function handleCallback(
  data: string, contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState, event: FunnelEvent, isNew: boolean,
): Promise<FunnelResponse | null> {
  // ── Customer type picker ──
  if (data.startsWith('ctype:')) {
    const ct = data.slice(6) as CustomerType;
    await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home', customerType: ct });
    const menu = ct === 'b2b' ? mainMenuB2bButtons() : mainMenuButtons();
    return { text: UI.homeWelcome(event.displayName), buttons: menu };
  }

  // ── Menu navigation ──
  if (data.startsWith('menu:')) {
    const action = data.slice(5);
    switch (action) {
      case 'home': {
        await clearSession(chatId, channel);
        const menu = state.customerType === 'b2b' ? mainMenuB2bButtons() : mainMenuButtons();
        return { text: UI.homeMenu, buttons: menu };
      }
      case 'order': {
        await setSessionState(chatId, channel, 'order', 'service', { screen: 'order' });
        return { text: 'Выберите услугу:', buttons: serviceSelectionButtons() };
      }
      case 'materials': {
        await setSessionState(chatId, channel, 'materials_menu', 'menu', { screen: 'materials_menu' });
        return { text: UI.materialsMenu(state.customerType === 'b2b'), buttons: materialsMenuButtons() };
      }
      case 'my_orders': {
        await setSessionState(chatId, channel, 'orders', 'list', { screen: 'orders' });
        const orders = await getMyBotOrders(contactId);
        if (orders.length === 0) {
          const bb: MessageButton = { type: 'callback', text: '🚀 Заказать', callback_data: 'menu:order' };
          return { text: UI.myOrdersEmpty, buttons: [[bb]] };
        }
        return { text: '<b>Мои заказы</b>', buttons: myOrdersButtons(orders as Array<{ id: string; human_id?: string; service_short?: string; status?: string }>) };
      }
      case 'referral': {
        await setSessionState(chatId, channel, 'referral', 'main', { screen: 'referral' });
        try {
          const link = await getReferralLink(contactId, 'PodraydPRO_bot');
          const stats = await getReferralStats(contactId);
          return { text: UI.referralIntro({ link, invited: stats.invited, balance: stats.balance }), buttons: referralButtons() };
        } catch {
          return { text: 'Ошибка. Попробуйте позже.', buttons: mainMenuButtons() };
        }
      }
      case 'referral_list':
        return { text: '👥 Список ваших рефералов будет доступен в ближайшее время.', buttons: backToHomeButton() };
      case 'help':
        return { text: UI.helpText, buttons: backToHomeButton() };
      case 'operator':
        return { text: UI.operatorText, buttons: backToHomeButton() };
      default: return null;
    }
  }

  // ── Service selection ──
  if (data.startsWith('svc:')) {
    const kind = data.slice(4) as BotServiceKind;
    const areasNeeded = ['lawn_mowing', 'scarification', 'aeration', 'land_clearing', 'weed_removal', 'tilling'].includes(kind);

    if (areasNeeded) {
      await setSessionState(chatId, channel, 'order', 'params', { ...state, screen: 'order', serviceKind: kind });
      return { text: `<b>${SERVICE_LABEL[kind]}</b>\n\nОцените площадь участка:`, buttons: areaButtons(kind) };
    }
    await setSessionState(chatId, channel, 'order', 'region', { ...state, screen: 'order', serviceKind: kind, area: 1, areaUnit: 'шт' });
    return { text: UI.askRegion, buttons: regionButtons() };
  }

  // ── Area selection → now goes to region ──
  if (data.startsWith('area:')) {
    const parsed = parseAreaBucket(data);
    if (!parsed) {
      await setSessionState(chatId, channel, 'order', 'params', { ...state, screen: 'order' });
      return { text: 'Напишите точную площадь в сотках (например, «15» или «3.5»):' };
    }
    const avgArea = Math.round((parsed.min + parsed.max) / 2) || parsed.max;
    await setSessionState(chatId, channel, 'order', 'region', { ...state, screen: 'order', area: avgArea, areaUnit: parsed.unit, areaBucket: parsed.bucket });
    return { text: UI.askRegion, buttons: regionButtons() };
  }

  // ── Region selection → then district ──
  if (data.startsWith('region:')) {
    const region = data.slice(7) as RegionCode;
    await setSessionState(chatId, channel, 'order', 'district', { ...state, screen: 'order', region });
    return { text: UI.askDistrict, buttons: districtButtons() };
  }

  // ── District → when ──
  if (data.startsWith('district:')) {
    const code = data.slice(9);
    const name = districtName(code) ?? code;
    await setSessionState(chatId, channel, 'order', 'when', { ...state, screen: 'order', district: name, districtCode: code });
    return { text: UI.askWhen, buttons: whenButtons() };
  }

  // ── When → confirm ──
  if (data.startsWith('when:')) {
    const label = data.slice(5);
    if (label === 'custom') {
      await setSessionState(chatId, channel, 'order', 'when', { ...state, screen: 'order' });
      return { text: 'Напишите удобную дату (например, «15 мая»):' };
    }
    const range = whenLabelToRange(label);
    if (!range) return null;

    const sk = state.serviceKind!; const area = state.area || 1;
    const price = await getPriceEstimate(sk, area);
    let discountPercent = 0, bonusRub = 0;
    try { const d = await computeDiscount(contactId); discountPercent = d.percent; bonusRub = d.bonusRub; } catch { /* ok */ }

    const final = applyDiscountToRange(price, discountPercent, Math.min(bonusRub, 500));

    await setSessionState(chatId, channel, 'order', 'confirm', {
      ...state, screen: 'order', whenLabel: label, whenHuman: range.human,
      whenFrom: range.from, whenTo: range.to, discountPercent, bonusRub: Math.min(bonusRub, 500),
    });

    return {
      text: UI.confirm({
        service: SERVICE_LABEL[sk], area: state.areaBucket
          ? `${state.areaBucket === '5' ? 'до 5' : state.areaBucket === '10' ? '5–10' : state.areaBucket === '20' ? '10–20' : '20+'} соток`
          : `${area} ${state.areaUnit ?? 'сотка'}`,
        district: `${REGION_LABEL[state.region ?? 'omsk']}, ${state.district ?? ''}`,
        when: range.human, priceLow: price.low, priceHigh: price.high,
        discountPercent, bonusRub, finalLow: final.low, finalHigh: final.high,
      }),
      buttons: confirmButtons(),
    };
  }

  // ── Confirm order ──
  if (data.startsWith('confirm:')) {
    const action = data.slice(8);
    if (action === 'yes') {
      const sk = state.serviceKind!; const area = state.area || 1;
      const price = await getPriceEstimate(sk, area);
      const discountPercent = state.discountPercent || 0; const bonusRub = state.bonusRub || 0;

      const leadId = await createBotLead({
        contactId, serviceKind: sk, channel,
        description: state.description, areaValue: area, areaUnit: state.areaUnit ?? 'сотка',
        district: `${REGION_LABEL[state.region ?? 'omsk']}, ${state.district ?? ''}`,
        discountPercent, discountRub: 0,
      });
      try { await applyDiscountToLead(contactId, leadId, discountPercent, bonusRub); } catch { /* ok */ }

      const humanId = `B-${leadId.slice(0, 6).toUpperCase()}`;

      void enqueueJob({ queueName: 'leads', jobType: 'bot.lead_created', dedupeKey: `bot:${leadId}`, payload: { contact_id: contactId, lead_id: leadId, service_kind: sk, channel, district: state.district, when: state.whenHuman, region: state.region } }).catch(() => {});

      await clearSession(chatId, channel);
      return { text: UI.thanks({ humanId, service: SERVICE_LABEL[sk], when: state.whenHuman, district: `${REGION_LABEL[state.region ?? 'omsk']}, ${state.district ?? ''}` }), buttons: postOrderButtons() };
    }
    if (action === 'cancel') { await clearSession(chatId, channel); return { text: '❌ Заказ отменён.\n\n' + UI.homeMenu, buttons: mainMenuButtons() }; }
    if (action === 'edit') { await setSessionState(chatId, channel, 'order', 'service', { screen: 'order' }); return { text: 'Выберите услугу заново:', buttons: serviceSelectionButtons() }; }
    return null;
  }

  // ── My Orders / Order card ──
  if (data.startsWith('order:')) {
    const parts = data.slice(6).split(':'); const leadId = parts[0]!; const action = parts[1]!;
    if (action === 'view') {
      const order = await getBotOrder(contactId, leadId);
      if (!order) return { text: 'Заказ не найден.', buttons: backToHomeButton() };
      const si = mapStatusToUi(String(order.status ?? 'new'));
      return { text: UI.orderCard({
        humanId: `B-${leadId.slice(0, 6).toUpperCase()}`, serviceName: String(order.service_name ?? ''),
        statusIcon: si.icon, statusLabel: si.label,
        when: order.desired_date_from ? String(order.desired_date_from) : undefined,
        district: order.district ? String(order.district) : undefined,
        area: order.area_value ? `${order.area_value} ${order.area_unit ?? ''}` : undefined,
        priceQuoted: order.price_final ? Number(order.price_final) : undefined,
        discountPercent: order.discount_percent ? Number(order.discount_percent) : undefined,
      }), buttons: orderCardButtons(leadId, String(order.status ?? 'new')) };
    }
    if (action === 'repeat') { await setSessionState(chatId, channel, 'repeat', 'when', { ...state, screen: 'repeat', activeLeadId: leadId }); return { text: '📅 На когда повторить заказ?', buttons: whenButtons() }; }
    if (action === 'edit_date') { await setSessionState(chatId, channel, 'edit_date', 'when', { ...state, screen: 'edit_date', activeLeadId: leadId }); return { text: '📅 Выберите новую дату:', buttons: whenButtons() }; }
    if (action === 'cancel') { const ok = await cancelBotOrder(contactId, leadId); return { text: ok ? '✅ Заказ отменён.' : '❌ Не удалось.', buttons: mainMenuButtons() }; }
  }

  // ── Materials: type selection ──
  if (data.startsWith('mat:')) {
    const action = data.slice(4);
    if (action === 'back') { await setSessionState(chatId, channel, 'materials_menu', 'menu', { screen: 'materials_menu' }); return { text: UI.materialsMenu(state.customerType === 'b2b'), buttons: materialsMenuButtons() }; }

    const mk = action as MaterialKind;
    await setSessionState(chatId, channel, 'material_order', 'mat_grade', { ...state, screen: 'material_order', materialKind: mk });
    return { text: UI.materialSelected(mk), buttons: gradeButtons(mk) };
  }

  // ── Materials: grade → qty ──
  if (data.startsWith('grade:')) {
    const parts = data.slice(6).split(':'); const mk = parts[0] as MaterialKind; const gc = parts[1]!;
    const grades = MATERIAL_GRADES[mk]; const g = grades.find((x) => x.code === gc);
    await setSessionState(chatId, channel, 'material_order', 'mat_qty', { ...state, screen: 'material_order', materialKind: mk, materialGradeCode: gc, materialGradeName: g?.name ?? gc });
    return { text: `Выбрано: <b>${MATERIAL_LABEL[mk]} ${g?.name ?? gc}</b>\n\n${UI.askMaterialQty(MATERIAL_UNIT[mk])}`, buttons: materialQtyButtons(MATERIAL_UNIT[mk]) };
  }

  // ── Materials: qty → when ──
  if (data.startsWith('qty:')) {
    const val = parseInt(data.slice(4), 10);
    if (!val) {
      await setSessionState(chatId, channel, 'material_order', 'mat_qty', { ...state, screen: 'material_order' });
      return { text: `Напишите точное количество в ${MATERIAL_UNIT[state.materialKind!]}:` };
    }
    await setSessionState(chatId, channel, 'material_order', 'mat_when', { ...state, screen: 'material_order', materialQty: val });
    return { text: 'Когда нужна доставка?', buttons: whenButtons() };
  }

  // ── Materials: when (callback) → address ──
  // Uses same when: prefix — check if we're in material flow
  if (data.startsWith('when:') && state.screen === 'material_order') {
    const label = data.slice(5);
    const range = whenLabelToRange(label);
    const wh = range?.human ?? label;
    await setSessionState(chatId, channel, 'material_order', 'mat_address', { ...state, screen: 'material_order', whenLabel: label, whenHuman: wh, whenFrom: range?.from, whenTo: range?.to });
    return { text: UI.askDeliveryAddress, buttons: [] };
  }

  // ── Materials: address → confirm ──
  // (address comes as free text — handled in handleMaterialText)

  // ── Materials confirm ──
  if (data.startsWith('matconfirm:')) {
    const action = data.slice(10);
    if (action === 'yes') {
      const mk = state.materialKind!; const gc = state.materialGradeCode!;
      const qty = state.materialQty || 1; const unit = MATERIAL_UNIT[mk];

      let orderId: string;
      try {
        orderId = await createMaterialOrder({
          contactId,
          materialCode: mk,
          grade: gc,
          quantity: qty,
          unit,
          deliveryAddress: state.deliveryAddress,
          desiredDate: state.whenHuman,
          region: state.region ?? 'omsk',
        });
      } catch (err) {
        log.error('[funnel-handler] createMaterialOrder failed', { error: String(err) });
        return { text: '❌ Не удалось создать заказ. Попробуйте позже.', buttons: mainMenuButtons() };
      }

      const humanId = `M-${orderId.slice(0, 6).toUpperCase()}`;

      void enqueueJob({
        queueName: 'leads',
        jobType: 'bot.material_order',
        dedupeKey: `mat:${orderId}`,
        payload: { contact_id: contactId, order_id: orderId, material_kind: mk, grade: gc, qty, unit, delivery_address: state.deliveryAddress, when: state.whenHuman },
      }).catch(() => {});

      await clearSession(chatId, channel);
      return { text: UI.materialThanks({ humanId, material: MATERIAL_LABEL[mk], grade: state.materialGradeName ?? gc }), buttons: postOrderButtons() };
    }
    if (action === 'cancel') { await clearSession(chatId, channel); return { text: '❌ Заказ отменён.', buttons: mainMenuButtons() }; }
  }

  // ── Funnel back ──
  if (data === 'funnel:back') {
    await setSessionState(chatId, channel, 'order', 'service', { ...state, screen: 'order' });
    return { text: 'Выберите услугу:', buttons: serviceSelectionButtons() };
  }

  return null;
}

/** Free-text in service order funnel */
async function handleFunnelText(
  text: string, contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState, event: FunnelEvent,
): Promise<FunnelResponse | null> {
  const numMatch = text.match(/^(\d+(?:[.,]\d+)?)$/);

  // Params step — parse area number
  if (state.screen === 'order' && !state.area) {
    if (numMatch) {
      const area = parseFloat(numMatch[1]!.replace(',', '.'));
      await setSessionState(chatId, channel, 'order', 'region', { ...state, screen: 'order', area, areaUnit: 'сотка', areaBucket: `${area}` });
      return { text: UI.askRegion, buttons: regionButtons() };
    }
    return { text: 'Пожалуйста, укажите площадь числом (например, «15»).' };
  }

  // When step — parse custom date → confirm
  if (state.screen === 'order' && !state.whenLabel) {
    const sk = state.serviceKind!; const area = state.area || 1;
    const price = await getPriceEstimate(sk, area);

    await setSessionState(chatId, channel, 'order', 'confirm', { ...state, screen: 'order', whenLabel: 'custom', whenCustom: text, whenHuman: text, whenFrom: text, whenTo: text });
    return {
      text: UI.confirm({ service: SERVICE_LABEL[sk], area: `${area} ${state.areaUnit ?? 'сотка'}`, district: `${REGION_LABEL[state.region ?? 'omsk']}, ${state.district ?? ''}`, when: text, priceLow: price.low, priceHigh: price.high }),
      buttons: confirmButtons(),
    };
  }

  // Repeat / edit_date
  if ((state.screen === 'repeat' || state.screen === 'edit_date') && state.activeLeadId) {
    const range = { from: text, to: text, human: text };
    if (state.screen === 'repeat') {
      try {
        const result = await repeatBotOrder(contactId, state.activeLeadId, channel, range);
        const humanId = `B-${result.newLeadId.slice(0, 6).toUpperCase()}`;
        await clearSession(chatId, channel);
        return { text: `✅ <b>Повторный заказ #${humanId}</b>\n\nУслуга: ${String(result.oldOrder.service_name ?? '')}\nКогда: ${text}\n\nМастер свяжется в течение 30 минут.`, buttons: postOrderButtons() };
      } catch (err) { log.error('[funnel-handler] repeatOrder', { error: String(err) }); return { text: '❌ Не удалось.', buttons: mainMenuButtons() }; }
    }
    if (state.screen === 'edit_date') {
      try { await updateBotOrderDate(contactId, state.activeLeadId, text, text); await clearSession(chatId, channel); return { text: `✅ Дата изменена на ${text}.`, buttons: mainMenuButtons() }; }
      catch { return { text: '❌ Не удалось.', buttons: mainMenuButtons() }; }
    }
  }

  return null;
}

/** Free-text in material order funnel */
async function handleMaterialText(
  text: string, contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState,
): Promise<FunnelResponse | null> {
  // Mat qty step — parse number
  if (state.screen === 'material_order' && !state.materialQty) {
    const numMatch = text.match(/^(\d+(?:[.,]\d+)?)$/);
    if (numMatch) {
      const qty = parseFloat(numMatch[1]!.replace(',', '.'));
      await setSessionState(chatId, channel, 'material_order', 'mat_when', { ...state, screen: 'material_order', materialQty: qty });
      return { text: 'Когда нужна доставка?', buttons: whenButtons() };
    }
    return { text: `Пожалуйста, укажите количество числом (например, «5»).` };
  }

  // Mat when step — parse custom date → address
  if (state.screen === 'material_order' && !state.whenLabel) {
    await setSessionState(chatId, channel, 'material_order', 'mat_address', { ...state, screen: 'material_order', whenLabel: 'custom', whenHuman: text });
    return { text: UI.askDeliveryAddress, buttons: [] };
  }

  // Address step → confirm
  if (state.screen === 'material_order' && !state.deliveryAddress && state.materialQty) {
    const mk = state.materialKind!; const gc = state.materialGradeCode!;
    const qty = state.materialQty; const unit = MATERIAL_UNIT[mk];
    const price = MATERIAL_PRICE_RANGE[mk];

    await setSessionState(chatId, channel, 'material_order', 'mat_confirm', { ...state, screen: 'material_order', deliveryAddress: text });

    return {
      text: UI.materialConfirm({
        material: MATERIAL_LABEL[mk], grade: state.materialGradeName ?? gc,
        qty, unit, when: state.whenHuman, address: text,
        priceLow: price.min, priceHigh: price.max,
      }),
      buttons: [
        [{ type: 'callback', text: '✅ Подтвердить', callback_data: 'matconfirm:yes' }],
        [{ type: 'callback', text: '❌ Отмена', callback_data: 'matconfirm:cancel' }],
      ],
    };
  }

  return null;
}
