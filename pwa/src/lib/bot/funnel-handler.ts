// Bot funnel event handler — processes callback_data and free-text in funnel context
import {
  getOrCreateSession, setSessionState, clearSession,
  createBotLead, computeDiscount, applyDiscountToLead,
  listMyAllOrders, getBotOrder, cancelBotOrder, updateBotOrderDate, repeatBotOrder,
  getPriceEstimate, getReferralLink, getReferralStats, recordReferralVisit,
  setContactRegion, setCustomerType, getContactCustomerType, notifyN8n,
  confirmBotOrder, resolveBotContext,
} from './index';
import { createMaterialOrder } from './order-flow';
import {
  SERVICE_LABEL, REGION_LABEL, MATERIAL_LABEL, MATERIAL_GRADES, MATERIAL_UNIT, MATERIAL_PRICE_RANGE,
  SUBSCRIPTION_PLANS, REGION_PRICE_MULT,
  UI, parseAreaBucket, whenLabelToRange, districtName,
  applyDiscountToRange, mapStatusToUi,
} from './funnel-state';
import {
  mainMenuButtons, mainMenuB2bButtons, customerTypeButtons, regionButtons,
  serviceSelectionButtons, areaButtons, districtButtons, whenButtons, confirmButtons,
  postOrderButtons, myOrdersButtons, orderCardButtons, referralButtons, backToHomeButton,
  materialsMenuButtons, gradeButtons, materialQtyButtons, extrasButtons,
  subscriptionPlansButtons, subscriptionPeriodButtons,
} from './keyboards';
import type { BotServiceKind, MaterialKind, RegionCode, CustomerType, SessionState, Screen, SubscriptionPlanCode } from './types';
import type { MessageButton } from '@/lib/channels/types';
import { enqueueJob } from '@/lib/job-queue';
import { log } from '@/lib/logger';
import { getTelegramConfig } from '@/lib/channels/config';

const MANAGER_CHAT_ID = '407721399';

async function notifyManager(text: string): Promise<void> {
  const cfg = getTelegramConfig();
  if (!cfg.botToken) return;
  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: MANAGER_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    log.error('[notifyManager] failed', { error: String(err) });
  }
}

export type FunnelEvent = {
  type: 'message' | 'command' | 'callback';
  channel: 'telegram' | 'max';
  chatId: string;
  userId: string;
  text: string;
  updateId: string;
  username?: string;
  displayName?: string;
  attachments?: Array<{ type: 'image' | 'document'; url?: string; filename?: string; mime_type?: string }>;
};

type FunnelResponse = { text: string; buttons?: MessageButton[][] };

/** Push current screen onto navStack so "◀️ Назад" can return to it. */
function pushNav(state: SessionState, prev: Screen): SessionState {
  const stack = (state.navStack ?? []).slice(-9);
  return { ...state, navStack: [...stack, prev] };
}

function popNav(state: SessionState): { state: SessionState; prev: Screen | undefined } {
  const stack = (state.navStack ?? []).slice();
  const prev = stack.pop();
  return { state: { ...state, navStack: stack }, prev };
}

function homeFor(region: RegionCode, customerType: CustomerType | undefined): MessageButton[][] {
  return customerType === 'b2b' ? mainMenuB2bButtons(region) : mainMenuButtons(region);
}

function isB2b(state: SessionState): boolean {
  return state.customerType === 'b2b';
}

/** Main entry point */
export async function handleFunnelEvent(event: FunnelEvent): Promise<FunnelResponse | null> {
  const { channel, chatId, userId, text, type } = event;

  // Single RPC: contact + session + profile (was 3 separate calls)
  let ctx: { contactId: string; isNew: boolean; region: RegionCode; customerType: CustomerType | undefined; session: Record<string, unknown> };
  try {
    const raw = await resolveBotContext({
      channel, externalId: userId, chatId,
      username: event.username, displayName: event.displayName,
    });
    ctx = { contactId: raw.contactId, isNew: raw.isNew, region: raw.region, customerType: raw.customerType, session: raw.session as unknown as Record<string, unknown> };
  } catch (err) {
    log.error('[funnel-handler] resolveBotContext failed', { error: String(err) });
    return null;
  }
  const { contactId } = ctx;

  let state: SessionState = (typeof ctx.session?.state === 'string' ? JSON.parse(ctx.session.state) : (ctx.session?.state ?? {})) as SessionState;
  // Default from context profile (skip region/customer-type picker steps for speed)
  if (!state.region) state = { ...state, region: ctx.region };
  if (!state.customerType && ctx.customerType) state = { ...state, customerType: ctx.customerType };
  if (!state.customerType) state = { ...state, customerType: 'b2c' };
  const screen = state.screen ?? 'home';
  const region = state.region ?? 'omsk';

  // ── Handle callbacks ──
  if (type === 'callback') {
    try {
      return await handleCallback(text, contactId, chatId, channel, state, event, ctx.isNew);
    } catch (err) {
      log.error('[funnel-handler] handleCallback threw', { error: String(err), text });
      return { text: '⚠️ Произошёл сбой. Попробуйте ещё раз.\n\n' + UI.homeMenu, buttons: homeFor(region, state.customerType) };
    }
  }

  // ── Handle commands ──
  if (type === 'command') {
    const [cmd, ...args] = text.split(/\s+/);

    if (cmd === '/start' && args[0]?.startsWith('ref_')) {
      const code = args[0]!.slice(4);
      let referrerName: string | undefined;
      try { referrerName = (await recordReferralVisit(contactId, code)) ?? undefined; } catch { /* ok */ }
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home', referredBy: code });
      if (referrerName) {
        return { text: UI.referralActivated(referrerName), buttons: [
          ...regionButtons(),
          [{ type: 'url', text: '📢 Вступить в чат', url: 'https://t.me/podryadpro_chat' }],
          [{ type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' }]
        ] };
      }
      return customerTypeOrHome(state, ctx.isNew, event.displayName);
    }

    if (cmd === '/start') {
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home' });
      return customerTypeOrHome(state, ctx.isNew, event.displayName);
    }

    if (cmd === '/cancel') {
      await clearSession(chatId, channel);
      return { text: '✅ Отменено.\n\n' + UI.homeMenu, buttons: mainMenuButtons() };
    }

    if (screen === 'order') return handleFunnelText(text, contactId, chatId, channel, state, event);
    if (screen === 'material_order') return handleMaterialText(text, contactId, chatId, channel, state);
    if (screen === 'subscription_confirm') return handleSubscriptionText(text, contactId, chatId, channel, state);
    if (screen === 'quick_order') return handleQuickOrder(text, contactId, chatId, channel, state, region, event.attachments);
  }

  if (type === 'message' && screen === 'order') return handleFunnelText(text, contactId, chatId, channel, state, event);
  if (type === 'message' && screen === 'material_order') return handleMaterialText(text, contactId, chatId, channel, state);
  if (type === 'message' && screen === 'subscription_confirm') return handleSubscriptionText(text, contactId, chatId, channel, state);
  if (type === 'message' && screen === 'quick_order') return handleQuickOrder(text, contactId, chatId, channel, state, region, event.attachments);

  // ── Smart quick-order detection: recognise service requests even without session state ──
  if (type === 'message') {
    const lower = text.toLowerCase().trim();
    const quickKeywords = ['покос', 'газон', 'мусор', 'сорняк', 'спил', 'вспашк', 'бассейн', 'сварк', 'расчистк', 'уборк', 'прополк', 'стрижк'];
    if (quickKeywords.some(k => lower.includes(k))) {
      const qr = await handleQuickOrder(text, contactId, chatId, channel, state, region, event.attachments);
      if (qr) {
        const hasConfirm = qr.buttons?.some(row => row.some(b => (b.callback_data || '').startsWith('confirm:')));
        if (hasConfirm) return qr;
      }
    }
  }

  // ── Fallback: help keywords / unknown ──
  if (type === 'message') {
    const lower = text.toLowerCase().trim();
    if (['help', 'помощь', 'справка', 'команды', '/help', '/h', 'что делать', 'что умеешь'].some(k => lower === k || lower.startsWith(k))) {
      return { text: UI.helpText, buttons: backToHomeButton() };
    }
    return { text: UI.unknown, buttons: homeFor(state.region ?? 'omsk', state.customerType) };
  }

  return null;
}

/** Quick order: parse text, extract service+area+when, show confirm. */
async function handleQuickOrder(
  text: string, contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState, region: RegionCode,
  attachments?: FunnelEvent['attachments'],
): Promise<FunnelResponse> {
  const lower = text.toLowerCase().trim();

  // Accumulate media IDs from any photo attachments
  const mediaIds = state.mediaIds ?? [];
  if (attachments?.length) {
    for (const a of attachments) {
      if (a.type === 'image' && a.url) mediaIds.push(a.url);
    }
  }

  // Parse service
  const serviceMap: Array<{ keys: string[]; kind: BotServiceKind }> = [
    { keys: ['покос', 'газон', 'косить', 'трава газон', 'стрижк'], kind: 'lawn_mowing' },
    { keys: ['сорняк', 'прополк', 'полот'], kind: 'weed_removal' },
    { keys: ['мусор', 'вывоз', 'вывез', 'хлам'], kind: 'debris_removal' },
    { keys: ['расчистк', 'участок', 'куст', 'зарос'], kind: 'land_clearing' },
    { keys: ['спил', 'дерев', 'корчеван'], kind: 'tree_cutting' },
    { keys: ['вспашк', 'пахот', 'культивац'], kind: 'tilling' },
    { keys: ['бассейн', 'чистк', 'обслуживан'], kind: 'pool_cleaning' },
    { keys: ['сварк', 'сварщик'], kind: 'welding' },
    { keys: ['скарификац', 'аэрац'], kind: 'scarification' },
    { keys: ['сборк'], kind: 'pool_assembly' },
  ];

  let serviceKind: BotServiceKind | undefined;
  for (const svc of serviceMap) {
    if (svc.keys.some(k => lower.includes(k))) { serviceKind = svc.kind; break; }
  }

  // Parse area
  let area: number | undefined;
  const areaMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:с[оо]т[оок][кв]|сот|ар|га)/i);
  if (areaMatch) area = parseFloat(areaMatch[1]!.replace(',', '.'));
  if (!area) {
    const numMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|кв\.?\s*м|м2)/i);
    if (numMatch) area = parseFloat(numMatch[1]!.replace(',', '.')) / 100;
  }
  if (!area) {
    const bareMatch = text.match(/(?:площад[ьи]?|участок|объём)\s*[:=]*\s*(\d+)/i);
    if (bareMatch) area = parseInt(bareMatch[1]!, 10);
  }

  // Parse when
  let whenHuman: string | undefined;
  let whenFrom: string | undefined;
  let whenTo: string | undefined;
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (/(?:сегодня|сейчас)/i.test(lower)) {
    whenHuman = 'Сегодня'; whenFrom = fmt(today); whenTo = fmt(today);
  } else if (/(?:завтра)/i.test(lower)) {
    const t = new Date(today); t.setDate(today.getDate() + 1);
    whenHuman = 'Завтра'; whenFrom = fmt(t); whenTo = fmt(t);
  } else if (/(?:выходн|суббот|воскрес)/i.test(lower)) {
    const t = new Date(today);
    if (t.getDay() === 6) { whenFrom = fmt(t); t.setDate(t.getDate() + 1); whenTo = fmt(t); }
    else { while (t.getDay() !== 6) t.setDate(t.getDate() + 1); whenFrom = fmt(t); t.setDate(t.getDate() + 1); whenTo = fmt(t); }
    whenHuman = 'На выходных';
  } else if (/(?:на недел|в течение недел|эта недел)/i.test(lower)) {
    const t = new Date(today); t.setDate(t.getDate() + 1);
    whenFrom = fmt(t); t.setDate(today.getDate() + 7); whenTo = fmt(t);
    whenHuman = 'На неделе';
  } else {
    const dateMatch = text.match(/(\d{1,2})\s*(мая|июня|июля|августа|сентября|октября|апреля)/i);
    if (dateMatch) {
      const months: Record<string, number> = { января:0, февраля:1, марта:2, апреля:3, мая:4, июня:5, июля:6, августа:7, сентября:8, октября:9, ноября:10, декабря:11 };
      const m = months[dateMatch[2]!.toLowerCase()];
      if (m !== undefined) {
        const d = new Date(today.getFullYear(), m, parseInt(dateMatch[1]!, 10));
        whenHuman = d.toLocaleDateString('ru', { day:'numeric', month:'long' });
        whenFrom = fmt(d); whenTo = fmt(d);
      }
    }
  }

  if (!serviceKind) {
    return { text: '🤔 Не совсем понял, какая услуга нужна.\n\nВыберите из списка или опишите точнее:', buttons: serviceSelectionButtons() };
  }

  if (!area) area = 1;

  const price = await getPriceEstimate(serviceKind, area, region);
  const discountPercent = state.discountPercent || 0;
  const bonusRub = state.bonusRub || 0;
  const final = applyDiscountToRange(price, discountPercent, Math.min(bonusRub, 500));

  const clean = { ...state, screen: 'order' as Screen, serviceKind, area, areaUnit: areaMatch ? 'сотка' : 'шт', district: REGION_LABEL[region], whenHuman, whenFrom, whenTo, whenLabel: whenHuman ? 'custom' : undefined, discountPercent, bonusRub: Math.min(bonusRub, 500), mediaIds: mediaIds.length > 0 ? mediaIds : undefined };
  await setSessionState(chatId, channel, 'order', 'confirm', clean);

  const priceLine = final.low !== final.high
    ? `от ${final.low} до ${final.high} ₽`
    : `${final.low} ₽`;

  return {
    text: `✅ <b>Проверьте</b>\n\n` +
      `Услуга: <b>${SERVICE_LABEL[serviceKind]}</b>\n` +
      `Площадь: ${area} ${areaMatch ? 'соток' : 'шт'}\n` +
      `Город: ${REGION_LABEL[region]}\n` +
      (whenHuman ? `Когда: ${whenHuman}\n` : '') +
      `\nЦена: ${priceLine}` +
      (discountPercent ? ` (скидка ${discountPercent}%)` : ''),
    buttons: confirmButtons(isB2b(state)),
  };
}

/** Skip region/ctype picker — defaults applied, main menu immediately. */
function regionOrTypeOrHome(state: SessionState, _isNew: boolean, displayName?: string): FunnelResponse {
  return customerTypeOrHome(state, _isNew, displayName);
}

/** Skip customer-type picker — B2C default, main menu immediately. */
function customerTypeOrHome(state: SessionState, _isNew: boolean, displayName?: string): FunnelResponse {
  const region = state.region ?? 'omsk';
  if (!state.ctypePicked) state = { ...state, ctypePicked: true };
  const menu = homeFor(region, state.customerType ?? 'b2c');
  const text = (state.customerType ?? 'b2c') === 'b2b' ? UI.homeWelcomeB2b(displayName) : UI.homeWelcome(displayName);
  return { text, buttons: menu };
}

/** Handle inline callbacks. */
async function handleCallback(
  data: string, contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState, event: FunnelEvent, _isNew: boolean,
): Promise<FunnelResponse | null> {
  const region = state.region ?? 'omsk';

  // ── Universal nav: Back / Home ──
  if (data === 'nav:home') {
    await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region, screen: 'home' });
    return { text: UI.homeMenu, buttons: homeFor(region, state.customerType) };
  }
  if (data === 'nav:back') {
    const popped = popNav(state);
    if (!popped.prev || popped.prev === 'home') {
      await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region, screen: 'home' });
      return { text: UI.homeMenu, buttons: homeFor(region, state.customerType) };
    }
    return showScreen(popped.prev, contactId, chatId, channel, popped.state);
  }

  // ── Customer type picker ──
  if (data.startsWith('ctype:')) {
    const ct = data.slice(6) as CustomerType;
    try { await setCustomerType(contactId, ct); } catch (err) { log.warn('[funnel-handler] setCustomerType failed', { error: String(err) }); }
    await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home', customerType: ct, ctypePicked: true, navStack: [] });
    const text = ct === 'b2b' ? UI.homeWelcomeB2b(event.displayName) : UI.homeWelcome(event.displayName);
    return { text, buttons: homeFor(region, ct) };
  }

  // ── Menu navigation ──
  if (data.startsWith('menu:')) {
    const action = data.slice(5);
    switch (action) {
      case 'home': {
        await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region, screen: 'home', navStack: [] });
        return { text: UI.homeMenu, buttons: homeFor(region, state.customerType) };
      }
      case 'quick_order': {
        await setSessionState(chatId, channel, 'quick_order', 'describe', { ...state, screen: 'quick_order' as Screen });
        return { text: '📝 <b>Опишите задачу</b>\n\nНапишите, что нужно сделать, какой объём и когда.\n<i>Например: «Покосить газон, 10 соток, завтра»</i>\n\n📸 Можете прикрепить фото.', buttons: [[{ type: 'callback', text: '◀️ Назад', callback_data: 'nav:back' }]] };
      }
      case 'services':
      case 'order': {
        const next = pushNav({ ...state, screen: 'services_menu' }, state.screen ?? 'home');
        await setSessionState(chatId, channel, 'services_menu', 'pick', next);
        return {
          text: isB2b(state) ? UI.servicesMenuIntroB2b : UI.servicesMenuIntro,
          buttons: serviceSelectionButtons(),
        };
      }
      case 'materials': {
        const next = pushNav({ ...state, screen: 'materials_menu' }, state.screen ?? 'home');
        await setSessionState(chatId, channel, 'materials_menu', 'pick', next);
        return { text: UI.materialsMenu(isB2b(state)), buttons: materialsMenuButtons() };
      }
      case 'subscription': {
        const next = pushNav({ ...state, screen: 'subscription_pick' }, state.screen ?? 'home');
        await setSessionState(chatId, channel, 'subscription_pick', 'plan', next);
        return { text: UI.subscriptionsIntro(REGION_LABEL[region]), buttons: subscriptionPlansButtons() };
      }
      case 'region': {
        const next = pushNav({ ...state, screen: 'region_pick' }, state.screen ?? 'home');
        await setSessionState(chatId, channel, 'region_pick', 'pick', next);
        return { text: UI.regionPickerIntro(REGION_LABEL[region]), buttons: regionButtons() };
      }
      case 'my_orders': {
        const next = pushNav({ ...state, screen: 'orders' }, state.screen ?? 'home');
        await setSessionState(chatId, channel, 'orders', 'list', next);
        const orders = await listMyAllOrders(contactId);
        if (orders.length === 0) {
          const bb: MessageButton = { type: 'callback', text: '🚀 Заказать', callback_data: 'menu:services' };
          return { text: UI.myOrdersEmpty, buttons: [[bb], [{ type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' }]] };
        }
        return {
          text: '<b>Мои заказы</b>',
          buttons: myOrdersButtons(orders as Array<{ kind?: string; id: string; human_id?: string; title?: string; status?: string }>),
        };
      }
      case 'referral': {
        const next = pushNav({ ...state, screen: 'referral' }, state.screen ?? 'home');
        await setSessionState(chatId, channel, 'referral', 'main', next);
        try {
          const botName = process.env.TELEGRAM_BOT_USERNAME || 'Podryad_PRO_bot';
          const link = await getReferralLink(contactId, botName);
          const stats = await getReferralStats(contactId);
          return { text: UI.referralIntro({ link, invited: stats.invited, balance: stats.balance }), buttons: referralButtons() };
        } catch {
          return { text: 'Ошибка. Попробуйте позже.', buttons: backToHomeButton() };
        }
      }
      case 'referral_list':
        return { text: '👥 Список ваших рефералов будет доступен в ближайшее время.', buttons: backToHomeButton() };
      case 'help':
        return { text: UI.helpText, buttons: backToHomeButton() };
      case 'operator':
        return { text: UI.operatorText, buttons: backToHomeButton() };
      case 'contract':
        return {
          text:
            '🤝 <b>Договор и счёт</b>\n\n' +
            'Менеджер свяжется с вами в течение часа: подготовит договор, выставит счёт, согласует график поставок. ' +
            'Если есть бриф/спецификация — пришлите файлом, оператор учтёт.',
          buttons: backToHomeButton(),
        };
      default: return null;
    }
  }

  // ── Region picker ──
  if (data.startsWith('region:')) {
    const code = data.slice(7) as RegionCode;
    if (state.screen === 'region_pick') {
      try { await setContactRegion(contactId, code); } catch (err) { log.warn('[funnel-handler] setContactRegion failed', { error: String(err) }); }
      await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region: code, regionPicked: true, screen: 'home', navStack: [] });
      if (!state.customerType) {
        return { text: UI.askCustomerType(event.displayName), buttons: customerTypeButtons() };
      }
      return {
        text: `${UI.regionChanged(REGION_LABEL[code])}\n\n${UI.homeMenu}`,
        buttons: homeFor(code, state.customerType),
      };
    }
    // Region picker inside service flow → keep flow going
    await setSessionState(chatId, channel, 'order', 'district', { ...state, screen: 'order', region: code, regionPicked: true });
    return { text: UI.askDistrict, buttons: districtButtons() };
  }

  // ── Subscription flow ──
  if (data.startsWith('sub:')) {
    const part = data.slice(4);
    if (part === 'info') {
      const lines = ['📅 <b>Что входит в пакеты</b>\n'];
      for (const code of ['basic', 'comfort', 'premium'] as SubscriptionPlanCode[]) {
        lines.push(UI.subscriptionPlanCard(SUBSCRIPTION_PLANS[code]));
        lines.push('');
      }
      return { text: lines.join('\n').trim(), buttons: subscriptionPlansButtons() };
    }
    if (part.startsWith('plan:')) {
      const plan = part.slice(5) as SubscriptionPlanCode;
      const next = pushNav({ ...state, screen: 'subscription_pick', subscriptionPlan: plan }, state.screen ?? 'home');
      await setSessionState(chatId, channel, 'subscription_pick', 'period', next);
      return {
        text: `${UI.subscriptionPlanCard(SUBSCRIPTION_PLANS[plan])}\n\nНа какой срок оформляем?`,
        buttons: subscriptionPeriodButtons(),
      };
    }
    if (part.startsWith('period:')) {
      const period = part.slice(7) as 'season' | 'half_year' | '3_months';
      const next = pushNav({ ...state, screen: 'subscription_confirm', subscriptionPeriod: period }, state.screen ?? 'home');
      await setSessionState(chatId, channel, 'subscription_confirm', 'district', next);
      return { text: UI.askDistrict, buttons: districtButtons() };
    }
  }

  // ── Service selection ──
  if (data.startsWith('svc:')) {
    const kind = data.slice(4) as BotServiceKind;
    const areasNeeded = ['lawn_mowing', 'scarification', 'aeration', 'land_clearing', 'weed_removal', 'tilling'].includes(kind);
    const next = pushNav({ ...state, screen: 'order', serviceKind: kind }, state.screen ?? 'services_menu');

    if (areasNeeded) {
      await setSessionState(chatId, channel, 'order', 'params', next);
      return { text: `<b>${SERVICE_LABEL[kind]}</b>\n\nОцените площадь участка:`, buttons: areaButtons(kind) };
    }
    await setSessionState(chatId, channel, 'order', 'when', { ...next, area: 1, areaUnit: 'шт', district: REGION_LABEL[region] });
    return { text: UI.askWhen, buttons: whenButtons() };
  }

  // ── Area selection ──
  if (data.startsWith('area:')) {
    const parsed = parseAreaBucket(data);
    if (!parsed) {
      await setSessionState(chatId, channel, 'order', 'params', { ...state, screen: 'order' });
      return { text: 'Напишите точную площадь в сотках (например, «15» или «3.5»):' };
    }
    const avgArea = Math.round((parsed.min + parsed.max) / 2) || parsed.max;
    // Skip district — go straight to when
    await setSessionState(chatId, channel, 'order', 'when', {
      ...state, screen: 'order', area: avgArea, areaUnit: parsed.unit, areaBucket: parsed.bucket, district: REGION_LABEL[region],
    });
    return { text: UI.askWhen, buttons: whenButtons() };
  }

  // ── District → when (kept for subscription flow and backwards compat) ──
  if (data.startsWith('district:')) {
    const code = data.slice(9);
    const name = districtName(code) ?? code;

    if (state.screen === 'subscription_confirm') {
      await setSessionState(chatId, channel, 'subscription_confirm', 'address', {
        ...state, screen: 'subscription_confirm', district: name, districtCode: code,
      });
      return { text: 'Напишите адрес (улица, дом).' };
    }
    // Direct path: district → when (kept for links/backwards compat)
    await setSessionState(chatId, channel, 'order', 'when', {
      ...state, screen: 'order', district: name, districtCode: code,
    });
    return { text: UI.askWhen, buttons: whenButtons() };
  }

  // ── When → confirm (services + materials share when: scope) ──
  if (data.startsWith('when:')) {
    const label = data.slice(5);
    if (label === 'asap') {
      // No date — skip directly to confirm
      const sk = state.serviceKind!; const area = state.area || 1;
      const price = await getPriceEstimate(sk, area, region);
      let discountPercent = 0, bonusRub = 0;
      try { const d = await computeDiscount(contactId); discountPercent = d.percent; bonusRub = d.bonusRub; } catch { /* ok */ }
      const final = applyDiscountToRange(price, discountPercent, Math.min(bonusRub, 500));
      await setSessionState(chatId, channel, 'order', 'confirm', {
        ...state, screen: 'order', whenLabel: 'asap', whenHuman: undefined,
        whenFrom: undefined, whenTo: undefined, discountPercent, bonusRub: Math.min(bonusRub, 500),
      });
      return {
        text: UI.confirm({
          service: SERVICE_LABEL[sk],
          area: state.areaBucket
            ? `${state.areaBucket === '5' ? 'до 5' : state.areaBucket === '10' ? '5–10' : state.areaBucket === '20' ? '10–20' : '20+'} соток`
            : `${area} ${state.areaUnit ?? 'сотка'}`,
          district: REGION_LABEL[region],
          when: 'Как можно скорее', priceLow: price.low, priceHigh: price.high,
          discountPercent, bonusRub: 0, finalLow: final.low, finalHigh: final.high,
        }),
        buttons: confirmButtons(isB2b(state)),
      };
    }
    if (label === 'custom') {
      // Stay in current screen so handleFunnelText / handleMaterialText catches the date
      return { text: 'Напишите удобную дату (например, «15 мая»):' };
    }
    const range = whenLabelToRange(label);
    if (!range) return null;

    if (state.screen === 'material_order') {
      // Materials: when → extras (multi-select)
      await setSessionState(chatId, channel, 'material_order', 'extras', {
        ...state, screen: 'material_order',
        whenLabel: label, whenHuman: range.human, whenFrom: range.from, whenTo: range.to,
      });
      return {
        text: UI.extrasIntro(MATERIAL_LABEL[state.materialKind ?? 'concrete']),
        buttons: extrasButtons({
          ...state,
          whenLabel: label, whenHuman: range.human, whenFrom: range.from, whenTo: range.to,
        }),
      };
    }

    const sk = state.serviceKind!; const area = state.area || 1;
    const price = await getPriceEstimate(sk, area, region);
    let discountPercent = 0, bonusRub = 0;
    try { const d = await computeDiscount(contactId); discountPercent = d.percent; bonusRub = d.bonusRub; } catch { /* ok */ }

    const final = applyDiscountToRange(price, discountPercent, Math.min(bonusRub, 500));

    await setSessionState(chatId, channel, 'order', 'confirm', {
      ...state, screen: 'order', whenLabel: label, whenHuman: range.human,
      whenFrom: range.from, whenTo: range.to, discountPercent, bonusRub: Math.min(bonusRub, 500),
    });

    return {
      text: UI.confirm({
        service: SERVICE_LABEL[sk],
        area: state.areaBucket
          ? `${state.areaBucket === '5' ? 'до 5' : state.areaBucket === '10' ? '5–10' : state.areaBucket === '20' ? '10–20' : '20+'} соток`
          : `${area} ${state.areaUnit ?? 'сотка'}`,
        district: `${REGION_LABEL[region]}, ${state.district ?? ''}`,
        when: range.human, priceLow: price.low, priceHigh: price.high,
        discountPercent, bonusRub, finalLow: final.low, finalHigh: final.high,
      }),
      buttons: confirmButtons(isB2b(state)),
    };
  }

  // ── Material extras: multi-select toggles ──
  if (data.startsWith('extra:')) {
    const part = data.slice(6);
    if (part === 'pump') {
      const next = { ...state, needsPump: !state.needsPump };
      await setSessionState(chatId, channel, 'material_order', 'extras', { ...next, screen: 'material_order' });
      return { text: UI.extrasIntro(MATERIAL_LABEL[state.materialKind ?? 'concrete']), buttons: extrasButtons(next) };
    }
    if (part === 'manip') {
      const next = { ...state, needsManipulator: !state.needsManipulator };
      await setSessionState(chatId, channel, 'material_order', 'extras', { ...next, screen: 'material_order' });
      return { text: UI.extrasIntro(MATERIAL_LABEL[state.materialKind ?? 'concrete']), buttons: extrasButtons(next) };
    }
    if (part === 'delivery_only') {
      const next = { ...state, deliveryOnly: !state.deliveryOnly };
      await setSessionState(chatId, channel, 'material_order', 'extras', { ...next, screen: 'material_order' });
      return { text: UI.extrasIntro(MATERIAL_LABEL[state.materialKind ?? 'concrete']), buttons: extrasButtons(next) };
    }
    if (part === 'done') {
      await setSessionState(chatId, channel, 'material_order', 'address', { ...state, screen: 'material_order' });
      return { text: UI.askDeliveryAddress };
    }
    return null;
  }

  // ── Confirm order (service flow) ──
  if (data.startsWith('confirm:')) {
    const action = data.slice(8);
    if (action === 'yes') {
    const sk = state.serviceKind;
    if (!sk) {
      log.error('[funnel-handler] when: missing serviceKind', { state: JSON.stringify({ screen: state.screen, region: state.region }) });
      await setSessionState(chatId, channel, 'services_menu', 'pick', { ...state, screen: 'services_menu', serviceKind: undefined, area: undefined, district: undefined, whenLabel: undefined });
      return { text: '⚠️ Данные заказа утеряны. Выберите услугу заново.', buttons: serviceSelectionButtons() };
    }
    const area = state.area || 1;
      const price = await getPriceEstimate(sk, area, region);
      const discountPercent = state.discountPercent || 0; const bonusRub = state.bonusRub || 0;

      let leadId: string;
      try {
        const result = await confirmBotOrder({
          contactId, serviceKind: sk, channel,
          description: state.description,
          areaValue: area, areaUnit: state.areaUnit ?? 'сотка',
          district: `${REGION_LABEL[region]}, ${state.district ?? ''}`,
          discountPercent,
          bonusRub,
          chatId,
        });
        leadId = result.leadId;
      } catch (err) {
        log.error('[funnel-handler] confirmBotOrder failed', { error: String(err), contactId, serviceKind: sk });
        return { text: '❌ Не удалось создать заявку. Попробуйте позже.', buttons: backToHomeButton() };
      }

      const humanId = `B-${leadId.slice(0, 6).toUpperCase()}`;

      void enqueueJob({
        queueName: 'leads', jobType: 'bot.lead_created', dedupeKey: `bot:${leadId}`,
        payload: { contact_id: contactId, lead_id: leadId, service_kind: sk, channel, district: state.district, when: state.whenHuman, region, customer_type: state.customerType },
      }).catch(() => {});

      void notifyN8n({
        type: 'lead.created',
        leadId, contactId, serviceKind: sk,
        channel, region, district: state.district, when: state.whenHuman,
        customerType: state.customerType ?? 'b2c',
        priceLow: price.low, priceHigh: price.high,
      });

      void notifyManager(
        `🆕 <b>Новая заявка #${humanId}</b>\n` +
        `Услуга: <b>${SERVICE_LABEL[sk]}</b>\n` +
        `Площадь: ${area} ${state.areaUnit ?? 'сотка'}\n` +
        `Район: ${state.district ?? 'не указан'}\n` +
        `Когда: ${state.whenHuman ?? 'не указано'}\n` +
        `Город: ${REGION_LABEL[region]}\n` +
        `Тип клиента: ${state.customerType === 'b2b' ? 'Бизнес' : 'Частник'}\n` +
        `Цена: от ${price.low} до ${price.high} ₽\n` +
        (discountPercent ? `Скидка: ${discountPercent}%\n` : '') +
        (state.mediaIds?.length ? `📸 Фото: ${state.mediaIds.length} шт.\n` : '') +
        `Канал: ${channel === 'telegram' ? 'Telegram' : 'MAX'}\n` +
        `\n<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru'}/admin">Открыть админку</a>`
      );

      const thanksText = isB2b(state)
        ? `🤝 <b>Запрос #${humanId} принят</b>\n\nУслуга: ${SERVICE_LABEL[sk]}\n${state.whenHuman ? `Когда: ${state.whenHuman}\n` : ''}Менеджер подготовит КП в течение часа.`
        : UI.thanks({ humanId, service: SERVICE_LABEL[sk], when: state.whenHuman, district: `${REGION_LABEL[region]}, ${state.district ?? ''}` });
      return { text: thanksText, buttons: postOrderButtons() };
    }
    if (action === 'cancel') {
      await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region, screen: 'home', navStack: [] });
      return { text: '❌ Заказ отменён.\n\n' + UI.homeMenu, buttons: homeFor(region, state.customerType) };
    }
    if (action === 'edit') {
      // Reset to first step of current service, not full services menu
      const sk = state.serviceKind!;
      const areasNeeded = ['lawn_mowing', 'scarification', 'aeration', 'land_clearing', 'weed_removal', 'tilling'].includes(sk);
      if (areasNeeded) {
        await setSessionState(chatId, channel, 'order', 'params', { ...state, screen: 'order', area: undefined, areaBucket: undefined, district: undefined, districtCode: undefined, whenLabel: undefined, whenHuman: undefined, whenFrom: undefined, whenTo: undefined });
        return { text: `<b>${SERVICE_LABEL[sk]}</b>\n\nОцените площадь участка:`, buttons: areaButtons(sk) };
      }
      await setSessionState(chatId, channel, 'order', 'district', { ...state, screen: 'order', district: undefined, districtCode: undefined, whenLabel: undefined, whenHuman: undefined, whenFrom: undefined, whenTo: undefined });
      return { text: UI.askDistrict, buttons: districtButtons() };
    }
    return null;
  }

  // ── Subscription confirm (sub_confirm:yes/cancel) ──
  if (data.startsWith('sub_confirm:')) {
    const action = data.slice(12);
    if (action === 'yes') {
      const plan = state.subscriptionPlan ?? 'basic';
      const sp = SUBSCRIPTION_PLANS[plan];
      const interval = state.subscriptionPeriod === '3_months' ? 90 : state.subscriptionPeriod === 'half_year' ? 180 : 14;

      let leadId: string;
      try {
        leadId = await createBotLead({
          contactId, serviceKind: 'subscription', channel,
          description: `Абонемент ${sp.name}, период: ${state.subscriptionPeriod ?? 'season'}, адрес: ${state.deliveryAddress ?? 'не указан'}`,
          district: `${REGION_LABEL[region]}, ${state.district ?? ''}`,
        });
      } catch (err) {
        log.error('[funnel-handler] createBotLead (subscription) failed', { error: String(err) });
        return { text: '❌ Не удалось создать заявку. Попробуйте позже.', buttons: backToHomeButton() };
      }

      const humanId = `S-${leadId.slice(0, 6).toUpperCase()}`;
      void notifyN8n({
        type: 'lead.created',
        subtype: 'subscription',
        leadId, contactId, plan, period: state.subscriptionPeriod, intervalDays: interval,
        channel, region, district: state.district, address: state.deliveryAddress, customerType: state.customerType ?? 'b2c',
      });

      await clearSession(chatId, channel);
      return { text: UI.subscriptionThanks({ humanId, plan: sp.name }), buttons: postOrderButtons() };
    }
    if (action === 'cancel') {
      await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region, screen: 'home', navStack: [] });
      return { text: '❌ Отменено.', buttons: homeFor(region, state.customerType) };
    }
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
    if (action === 'back') {
      const next = pushNav({ ...state, screen: 'materials_menu' }, state.screen ?? 'home');
      await setSessionState(chatId, channel, 'materials_menu', 'pick', next);
      return { text: UI.materialsMenu(isB2b(state)), buttons: materialsMenuButtons() };
    }

    const mk = action as MaterialKind;
    const next = pushNav({ ...state, screen: 'material_order', materialKind: mk }, state.screen ?? 'materials_menu');
    await setSessionState(chatId, channel, 'material_order', 'grade', next);
    return { text: UI.materialSelected(mk), buttons: gradeButtons(mk) };
  }

  // ── Materials: grade → qty ──
  if (data.startsWith('grade:')) {
    const parts = data.slice(6).split(':');
    const mk = parts[0] as MaterialKind;
    const gc = parts[1]!;
    const grades = MATERIAL_GRADES[mk]; const g = grades.find((x) => x.code === gc);
    const gName = gc === 'unknown' ? 'не знаю — посоветуйте' : (g?.name ?? gc);
    const next = pushNav({ ...state, screen: 'material_order', materialKind: mk, materialGradeCode: gc, materialGradeName: gName }, state.screen ?? 'material_order');
    await setSessionState(chatId, channel, 'material_order', 'qty', next);
    return {
      text: `Выбрано: <b>${MATERIAL_LABEL[mk]} ${gName}</b>\n\n${UI.askMaterialQty(MATERIAL_UNIT[mk])}`,
      buttons: materialQtyButtons(MATERIAL_UNIT[mk]),
    };
  }

  // ── Materials: qty → when ──
  if (data.startsWith('qty:')) {
    if (data === 'qty:custom') {
      await setSessionState(chatId, channel, 'material_order', 'qty', { ...state, screen: 'material_order' });
      return { text: `Напишите точное количество в ${MATERIAL_UNIT[state.materialKind!]}:` };
    }
    const val = parseFloat(data.slice(4));
    if (!val) return null;
    await setSessionState(chatId, channel, 'material_order', 'when', { ...state, screen: 'material_order', materialQty: val });
    return { text: 'Когда нужна доставка?', buttons: whenButtons() };
  }

  // ── Materials confirm ──
  if (data.startsWith('matconfirm:')) {
    const action = data.slice(11);
    if (action === 'yes') {
      const mk = state.materialKind!; const gc = state.materialGradeCode!;
      const qty = state.materialQty || 1; const unit = MATERIAL_UNIT[mk];

      let orderId: string;
      try {
        orderId = await createMaterialOrder({
          contactId,
          materialCode: mk,
          grade: gc === 'unknown' ? (MATERIAL_GRADES[mk][0]?.code ?? 'M200') : gc,
          quantity: qty,
          unit,
          deliveryAddress: state.deliveryAddress,
          desiredDate: state.whenHuman,
          region,
          needsPump: state.needsPump,
          needsManipulator: state.needsManipulator,
          deliveryOnly: state.deliveryOnly,
        });
      } catch (err) {
        log.error('[funnel-handler] createMaterialOrder failed', { error: String(err) });
        return { text: '❌ Не удалось создать заказ. Попробуйте позже.', buttons: backToHomeButton() };
      }

      const humanId = `M-${orderId.slice(0, 6).toUpperCase()}`;

      void enqueueJob({
        queueName: 'leads', jobType: 'bot.material_order', dedupeKey: `mat:${orderId}`,
        payload: {
          contact_id: contactId, order_id: orderId, material_kind: mk, grade: gc, qty, unit,
          delivery_address: state.deliveryAddress, when: state.whenHuman, region,
          customer_type: state.customerType,
          needs_pump: state.needsPump, needs_manipulator: state.needsManipulator, delivery_only: state.deliveryOnly,
        },
      }).catch(() => {});

      void notifyN8n({
        type: 'material_order.created',
        orderId, contactId, materialKind: mk, gradeCode: gc, quantity: qty, unit,
        channel, region, deliveryAddress: state.deliveryAddress, when: state.whenHuman,
        customerType: state.customerType ?? 'b2c',
        extras: {
          pump: !!state.needsPump,
          manipulator: !!state.needsManipulator,
          deliveryOnly: !!state.deliveryOnly,
        },
      });

      void notifyManager(
        `🧱 <b>Новый заказ материалов #${humanId}</b>\n` +
        `Материал: <b>${MATERIAL_LABEL[mk]} ${state.materialGradeName ?? gc}</b>\n` +
        `Количество: ${qty} ${unit}\n` +
        `Адрес: ${state.deliveryAddress ?? 'не указан'}\n` +
        `Когда: ${state.whenHuman ?? 'не указано'}\n` +
        `Город: ${REGION_LABEL[region]}\n` +
        `Тип клиента: ${state.customerType === 'b2b' ? 'Бизнес' : 'Частник'}\n` +
        `Доп:${state.needsPump ? ' бетононасос' : ''}${state.needsManipulator ? ' манипулятор' : ''}${state.deliveryOnly ? ' разгрузка с борта' : ''}\n` +
        `Канал: ${channel === 'telegram' ? 'Telegram' : 'MAX'}\n` +
        `\n<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru'}/admin">Открыть админку</a>`
      );

      await clearSession(chatId, channel);
      const thanksText = isB2b(state)
        ? `🤝 <b>Запрос на материалы #${humanId} принят</b>\n\n${MATERIAL_LABEL[mk]} ${state.materialGradeName ?? gc}, ${qty} ${unit}.\n\nМенеджер подготовит КП в течение часа.`
        : UI.materialThanks({ humanId, material: MATERIAL_LABEL[mk], grade: state.materialGradeName ?? gc });
      return { text: thanksText, buttons: postOrderButtons() };
    }
    if (action === 'cancel') {
      await setSessionState(chatId, channel, 'home', 'start', { customerType: state.customerType, region, screen: 'home', navStack: [] });
      return { text: '❌ Заказ отменён.', buttons: homeFor(region, state.customerType) };
    }
  }

  // ── Material order from history ──
  if (data.startsWith('morder:')) {
    const parts = data.slice(7).split(':'); const orderId = parts[0]!; const action = parts[1]!;
    if (action === 'view') {
      const { getServiceClient } = await import('@/lib/supabase');
      const { data: m } = await getServiceClient()
        .from('v_material_orders_detail')
        .select('*')
        .eq('id', orderId)
        .eq('contact_id', contactId)
        .maybeSingle();
      if (!m) return { text: 'Заказ не найден.', buttons: backToHomeButton() };
      const mm = m as Record<string, unknown>;
      const lines = [
        `🧱 <b>Заказ материалов #${('M-' + orderId.slice(0, 6).toUpperCase())}</b>`,
        `Материал: ${String(mm.material_name ?? '')} ${String(mm.grade ?? '')}`,
        `Количество: ${String(mm.quantity ?? '')} ${String(mm.unit ?? '')}`,
        mm.delivery_address ? `Адрес: ${String(mm.delivery_address)}` : '',
        `Статус: ${String(mm.status ?? 'new')}`,
      ].filter(Boolean);
      return { text: lines.join('\n'), buttons: backToHomeButton() };
    }
  }

  // ── Order list (services) ──
  if (data.startsWith('order:')) {
    return handleOrderCallback(data, contactId, chatId, channel, state);
  }

  return null;
}

/** Service order card actions (view/repeat/edit_date/cancel). */
async function handleOrderCallback(
  data: string, contactId: string, chatId: string, channel: 'telegram' | 'max', state: SessionState,
): Promise<FunnelResponse | null> {
  const parts = data.slice(6).split(':'); const leadId = parts[0]!; const action = parts[1]!;
  if (action === 'view') {
    const order = await getBotOrder(contactId, leadId);
    if (!order) return { text: 'Заказ не найден.', buttons: backToHomeButton() };
    const si = mapStatusToUi(String(order.status ?? 'new'));
    return {
      text: UI.orderCard({
        humanId: `B-${leadId.slice(0, 6).toUpperCase()}`, serviceName: String(order.service_name ?? ''),
        statusIcon: si.icon, statusLabel: si.label,
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
    await setSessionState(chatId, channel, 'repeat', 'when', { ...state, screen: 'repeat', activeLeadId: leadId });
    return { text: '📅 На когда повторить заказ?', buttons: whenButtons() };
  }
  if (action === 'edit_date') {
    await setSessionState(chatId, channel, 'edit_date', 'when', { ...state, screen: 'edit_date', activeLeadId: leadId });
    return { text: '📅 Выберите новую дату:', buttons: whenButtons() };
  }
  if (action === 'cancel') {
    const ok = await cancelBotOrder(contactId, leadId);
    return { text: ok ? '✅ Заказ отменён.' : '❌ Не удалось.', buttons: backToHomeButton() };
  }
  return null;
}

/** Render a known screen; used by nav:back to restore the previous screen. */
async function showScreen(
  screen: Screen, contactId: string, chatId: string, channel: 'telegram' | 'max', state: SessionState,
): Promise<FunnelResponse> {
  const region = state.region ?? 'omsk';
  switch (screen) {
    case 'home':
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home' });
      return { text: UI.homeMenu, buttons: homeFor(region, state.customerType) };
    case 'services_menu':
      await setSessionState(chatId, channel, 'services_menu', 'pick', { ...state, screen: 'services_menu' });
      return { text: isB2b(state) ? UI.servicesMenuIntroB2b : UI.servicesMenuIntro, buttons: serviceSelectionButtons() };
    case 'materials_menu':
      await setSessionState(chatId, channel, 'materials_menu', 'pick', { ...state, screen: 'materials_menu' });
      return { text: UI.materialsMenu(isB2b(state)), buttons: materialsMenuButtons() };
    case 'subscription_pick':
      await setSessionState(chatId, channel, 'subscription_pick', 'plan', { ...state, screen: 'subscription_pick' });
      return { text: UI.subscriptionsIntro(REGION_LABEL[region]), buttons: subscriptionPlansButtons() };
    case 'order': {
      if (state.serviceKind) {
        const areasNeeded = ['lawn_mowing', 'scarification', 'aeration', 'land_clearing', 'weed_removal', 'tilling'].includes(state.serviceKind);
        const clean = { ...state, screen: 'order' as const, area: undefined as number|undefined, areaBucket: undefined, areaUnit: undefined, district: undefined, districtCode: undefined, whenLabel: undefined, whenHuman: undefined, whenFrom: undefined, whenTo: undefined };
        if (areasNeeded) {
          await setSessionState(chatId, channel, 'order', 'params', clean);
          return { text: `<b>${SERVICE_LABEL[state.serviceKind]}</b>\n\nОцените площадь участка:`, buttons: areaButtons(state.serviceKind) };
        }
        await setSessionState(chatId, channel, 'order', 'district', clean);
        return { text: UI.askDistrict, buttons: districtButtons() };
      }
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home' });
      return { text: UI.homeMenu, buttons: homeFor(region, state.customerType) };
    }
    case 'material_order':
      await setSessionState(chatId, channel, 'home', 'start', { ...state, screen: 'home' });
      return { text: '❌ Отменено.\n\n' + UI.homeMenu, buttons: homeFor(region, state.customerType) };
    case 'orders': {
      const orders = await listMyAllOrders(contactId);
      if (orders.length === 0) {
        const bb: MessageButton = { type: 'callback', text: '🚀 Заказать', callback_data: 'menu:services' };
        return { text: UI.myOrdersEmpty, buttons: [[bb], [{ type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' }]] };
      }
      return { text: '<b>Мои заказы</b>', buttons: myOrdersButtons(orders as Array<{ kind?: string; id: string; human_id?: string; title?: string; status?: string }>) };
    }
    default:
      return { text: UI.homeMenu, buttons: homeFor(region, state.customerType) };
  }
}

/** Free-text in service order funnel. */
async function handleFunnelText(
  text: string, contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState, _event: FunnelEvent,
): Promise<FunnelResponse | null> {
  const numMatch = text.match(/^(\d+(?:[.,]\d+)?)$/);
  const region = state.region ?? 'omsk';

  // Params step — parse area number, then go to district
  if (state.screen === 'order' && !state.area) {
    if (numMatch) {
      const area = parseFloat(numMatch[1]!.replace(',', '.'));
      await setSessionState(chatId, channel, 'order', 'district', { ...state, screen: 'order', area, areaUnit: 'сотка', areaBucket: `${area}` });
      return { text: UI.askDistrict, buttons: districtButtons() };
    }
    return { text: 'Пожалуйста, укажите площадь числом (например, «15»).' };
  }

  // When step — parse custom date → confirm
  if (state.screen === 'order' && !state.whenLabel) {
    const sk = state.serviceKind!; const area = state.area || 1;
    const price = await getPriceEstimate(sk, area, region);
    await setSessionState(chatId, channel, 'order', 'confirm', {
      ...state, screen: 'order', whenLabel: 'custom', whenCustom: text, whenHuman: text, whenFrom: text, whenTo: text,
    });
    return {
      text: UI.confirm({
        service: SERVICE_LABEL[sk], area: `${area} ${state.areaUnit ?? 'сотка'}`,
        district: `${REGION_LABEL[region]}, ${state.district ?? ''}`,
        when: text, priceLow: price.low, priceHigh: price.high,
      }),
      buttons: confirmButtons(isB2b(state)),
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
        return {
          text: `✅ <b>Повторный заказ #${humanId}</b>\n\nУслуга: ${String(result.oldOrder.service_name ?? '')}\nКогда: ${text}\n\nМастер свяжется в течение 30 минут.`,
          buttons: postOrderButtons(),
        };
      } catch (err) {
        log.error('[funnel-handler] repeatOrder', { error: String(err) });
        return { text: '❌ Не удалось.', buttons: backToHomeButton() };
      }
    }
    if (state.screen === 'edit_date') {
      try {
        await updateBotOrderDate(contactId, state.activeLeadId, text, text);
        await clearSession(chatId, channel);
        return { text: `✅ Дата изменена на ${text}.`, buttons: backToHomeButton() };
      } catch {
        return { text: '❌ Не удалось.', buttons: backToHomeButton() };
      }
    }
  }

  return null;
}

/** Free-text in subscription funnel: address. */
async function handleSubscriptionText(
  text: string, _contactId: string, chatId: string, channel: 'telegram' | 'max', state: SessionState,
): Promise<FunnelResponse | null> {
  const region = state.region ?? 'omsk';
  if (!state.deliveryAddress) {
    const plan = state.subscriptionPlan ?? 'basic';
    const sp = SUBSCRIPTION_PLANS[plan];
    const periodLabel = state.subscriptionPeriod === '3_months'
      ? '3 месяца' : state.subscriptionPeriod === 'half_year' ? 'полгода' : 'сезон';
    await setSessionState(chatId, channel, 'subscription_confirm', 'confirm', { ...state, deliveryAddress: text });
    return {
      text: UI.subscriptionConfirm({
        plan: sp.name, period: periodLabel,
        district: `${REGION_LABEL[region]}, ${state.district ?? ''}`,
        address: text,
        priceLow: sp.priceMin, priceHigh: sp.priceMax,
      }),
      buttons: [
        [{ type: 'callback', text: '✅ Подтвердить', callback_data: 'sub_confirm:yes' }],
        [{ type: 'callback', text: '❌ Отмена', callback_data: 'sub_confirm:cancel' }],
      ],
    };
  }
  return null;
}

/** Free-text in material order funnel. */
async function handleMaterialText(
  text: string, _contactId: string, chatId: string, channel: 'telegram' | 'max',
  state: SessionState,
): Promise<FunnelResponse | null> {
  const region = state.region ?? 'omsk';

  // qty step — parse number
  if (state.screen === 'material_order' && !state.materialQty) {
    const numMatch = text.match(/^(\d+(?:[.,]\d+)?)$/);
    if (numMatch) {
      const qty = parseFloat(numMatch[1]!.replace(',', '.'));
      await setSessionState(chatId, channel, 'material_order', 'when', { ...state, screen: 'material_order', materialQty: qty });
      return { text: 'Когда нужна доставка?', buttons: whenButtons() };
    }
    return { text: `Пожалуйста, укажите количество числом (например, «5»).` };
  }

  // custom date — go to extras
  if (state.screen === 'material_order' && !state.whenLabel) {
    await setSessionState(chatId, channel, 'material_order', 'extras', {
      ...state, screen: 'material_order', whenLabel: 'custom', whenHuman: text,
    });
    return {
      text: UI.extrasIntro(MATELABEL(state.materialKind)),
      buttons: extrasButtons({ ...state, whenLabel: 'custom', whenHuman: text }),
    };
  }

  // address — go to confirm
  if (state.screen === 'material_order' && !state.deliveryAddress && state.materialQty) {
    const mk = state.materialKind!; const gc = state.materialGradeCode!;
    const qty = state.materialQty; const unit = MATERIAL_UNIT[mk];
    const base = MATERIAL_PRICE_RANGE[mk];
    const m = REGION_PRICE_MULT[region] ?? 1.0;
    const priceLow = Math.round(base.min * m);
    const priceHigh = Math.round(base.max * m);

    await setSessionState(chatId, channel, 'material_order', 'confirm', { ...state, screen: 'material_order', deliveryAddress: text });

    const extras: string[] = [];
    if (state.needsPump) extras.push('бетононасос');
    if (state.needsManipulator) extras.push('манипулятор');
    if (state.deliveryOnly) extras.push('только разгрузка с борта');
    const extrasLine = extras.length ? `\nДоп: ${extras.join(', ')}` : '';

    return {
      text: UI.materialConfirm({
        material: MATERIAL_LABEL[mk], grade: state.materialGradeName ?? gc,
        qty, unit, when: state.whenHuman, address: text,
        priceLow, priceHigh,
      }) + extrasLine,
      buttons: [
        [
          isB2b(state)
            ? { type: 'callback', text: '🤝 Запросить КП', callback_data: 'matconfirm:yes' }
            : { type: 'callback', text: '✅ Подтвердить', callback_data: 'matconfirm:yes' },
        ],
        [{ type: 'callback', text: '❌ Отмена', callback_data: 'matconfirm:cancel' }],
      ],
    };
  }

  return null;
}

/** Local helper: material label by kind (safe default if missing). */
function MATELABEL(mk: MaterialKind | undefined): string {
  if (!mk) return 'материал';
  return MATERIAL_LABEL[mk];
}
