// Bot funnel state machine — adapted from Premium lib/funnels.ts
import type { BotServiceKind, MaterialKind, SessionState, OrderStep, RegionCode, SubscriptionPlanCode } from './types';

export const BRAND_NAME = process.env.BOT_BRAND_NAME || 'Подряд PRO';

export const SERVICE_LABEL: Record<BotServiceKind, string> = {
  lawn_mowing: 'Покос газона',
  scarification: 'Скарификация',
  aeration: 'Аэрация',
  land_clearing: 'Расчистка участка',
  tree_cutting: 'Спил деревьев',
  stump_removal: 'Корчевание пней',
  debris_removal: 'Вывоз мусора',
  pool_cleaning: 'Чистка бассейна',
  pool_assembly: 'Сборка бассейна',
  weed_removal: 'Удаление сорняков',
  pool_maintenance: 'Обслуживание бассейна',
  welding: 'Сварка',
  tilling: 'Вспашка',
  subscription: 'Подписка',
};

export const PRICE_HINT: Record<BotServiceKind, string> = {
  lawn_mowing: '≈ 500–1500 ₽ за сотку',
  scarification: '≈ 800–2000 ₽ за сотку',
  aeration: '≈ 600–1800 ₽ за сотку',
  land_clearing: '≈ 1500–5000 ₽ за сотку',
  tree_cutting: '≈ 1000–10000 ₽ за дерево',
  stump_removal: '≈ 500–5000 ₽ за пень',
  debris_removal: '≈ 500–3000 ₽ за м³',
  pool_cleaning: '≈ 2000–8000 ₽',
  pool_assembly: '≈ 3000–15000 ₽',
  weed_removal: '≈ 400–1200 ₽ за сотку',
  pool_maintenance: '≈ 1500–5000 ₽',
  welding: '≈ 1000–5000 ₽',
  tilling: '≈ 800–2500 ₽ за сотку',
  subscription: 'от 3000 ₽/мес',
};

export const PRICE_RANGE: Record<BotServiceKind, { min: number; max: number; minOrder?: number }> = {
  lawn_mowing: { min: 500, max: 1500, minOrder: 1500 },
  scarification: { min: 800, max: 2000 },
  aeration: { min: 600, max: 1800 },
  land_clearing: { min: 1500, max: 5000 },
  tree_cutting: { min: 1000, max: 10000 },
  stump_removal: { min: 500, max: 5000 },
  debris_removal: { min: 500, max: 3000 },
  pool_cleaning: { min: 2000, max: 8000 },
  pool_assembly: { min: 3000, max: 15000 },
  weed_removal: { min: 400, max: 1200 },
  pool_maintenance: { min: 1500, max: 5000 },
  welding: { min: 1000, max: 5000 },
  tilling: { min: 800, max: 2500 },
  subscription: { min: 3000, max: 10000 },
};

export const DISTRICTS: Array<{ code: string; name: string }> = [
  { code: 'chkalovskiy', name: 'Чкаловский' },
  { code: 'kirovskiy', name: 'Кировский' },
  { code: 'leninskiy', name: 'Ленинский' },
  { code: 'oktyabrskiy', name: 'Октябрьский' },
  { code: 'sovetskiy', name: 'Советский' },
  { code: 'other', name: 'Другой' },
];

export const REGION_LABEL: Record<RegionCode, string> = {
  omsk: 'Омск',
  novosibirsk: 'Новосибирск',
};

export const MATERIAL_LABEL: Record<MaterialKind, string> = {
  concrete: 'Бетон',
  crushed_stone: 'Щебень',
  sand: 'Песок',
  cement: 'Цемент',
  brick: 'Кирпич',
};

export const MATERIAL_DESC: Record<MaterialKind, string> = {
  concrete: 'Бетон любых марок: M100–M400. Доставка миксером.',
  crushed_stone: 'Щебень всех фракций: 5–20, 20–40, 40–70, гранитный, гравийный.',
  sand: 'Песок карьерный, речной, мытый, строительный.',
  cement: 'Цемент M400, M500. В мешках 25/50 кг или россыпью.',
  brick: 'Кирпич рядовой, облицовочный, силикатный, керамический.',
};

export const MATERIAL_UNIT: Record<MaterialKind, string> = {
  concrete: 'м³',
  crushed_stone: 'т',
  sand: 'т',
  cement: 'меш',
  brick: 'шт',
};

export const MATERIAL_GRADES: Record<MaterialKind, Array<{ code: string; name: string; priceHint?: string }>> = {
  concrete: [
    { code: 'M100', name: 'M100 (стяжка)', priceHint: '≈ 5 200 ₽/м³' },
    { code: 'M150', name: 'M150 (дорожки)', priceHint: '≈ 5 500 ₽/м³' },
    { code: 'M200', name: 'M200 (фундамент)', priceHint: '≈ 5 700 ₽/м³' },
    { code: 'M250', name: 'M250 (перекрытия)', priceHint: '≈ 6 000 ₽/м³' },
    { code: 'M300', name: 'M300 (стены)', priceHint: '≈ 6 300 ₽/м³' },
    { code: 'M350', name: 'M350 (балки)', priceHint: '≈ 6 800 ₽/м³' },
    { code: 'M400', name: 'M400 (колонны)', priceHint: '≈ 7 500 ₽/м³' },
  ],
  crushed_stone: [
    { code: '5-20', name: '5–20 мм (гранитный)', priceHint: '≈ 1 800 ₽/т' },
    { code: '20-40', name: '20–40 мм (гранитный)', priceHint: '≈ 1 700 ₽/т' },
    { code: '40-70', name: '40–70 мм', priceHint: '≈ 1 500 ₽/т' },
    { code: 'gravel', name: 'Гравийный', priceHint: '≈ 1 200 ₽/т' },
    { code: 'limestone', name: 'Известковый', priceHint: '≈ 900 ₽/т' },
  ],
  sand: [
    { code: 'quarry', name: 'Карьерный', priceHint: '≈ 500 ₽/т' },
    { code: 'river', name: 'Речной', priceHint: '≈ 700 ₽/т' },
    { code: 'washed', name: 'Мытый', priceHint: '≈ 850 ₽/т' },
    { code: 'construction', name: 'Строительный', priceHint: '≈ 650 ₽/т' },
  ],
  cement: [
    { code: 'M400', name: 'M400 (50 кг мешок)', priceHint: '≈ 420 ₽/меш' },
    { code: 'M500', name: 'M500 (50 кг мешок)', priceHint: '≈ 480 ₽/меш' },
  ],
  brick: [
    { code: 'ordinary', name: 'Рядовой', priceHint: '≈ 12 ₽/шт' },
    { code: 'facing', name: 'Облицовочный', priceHint: '≈ 18 ₽/шт' },
    { code: 'silicate', name: 'Силикатный', priceHint: '≈ 10 ₽/шт' },
    { code: 'ceramic', name: 'Керамический', priceHint: '≈ 25 ₽/шт' },
  ],
};

export const MATERIAL_PRICE_RANGE: Record<MaterialKind, { min: number; max: number }> = {
  concrete: { min: 5200, max: 7500 },
  crushed_stone: { min: 900, max: 1800 },
  sand: { min: 500, max: 850 },
  cement: { min: 420, max: 480 },
  brick: { min: 10, max: 25 },
};

/** Региональный множитель цены: Омск = базовая, Новосибирск = +5 %. */
export const REGION_PRICE_MULT: Record<RegionCode, number> = {
  omsk: 1.0,
  novosibirsk: 1.05,
};

export type SubscriptionPlan = {
  code: SubscriptionPlanCode;
  name: string;
  short: string;
  priceMin: number;
  priceMax: number;
  features: string[];
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, SubscriptionPlan> = {
  basic: {
    code: 'basic',
    name: 'Базовый',
    short: '🌿 Базовый — от 8 000 ₽/мес',
    priceMin: 8000,
    priceMax: 14000,
    features: ['Покос 2 раза в месяц', 'Прополка', 'Уборка скошенной травы'],
  },
  comfort: {
    code: 'comfort',
    name: 'Комфорт',
    short: '⭐ Комфорт — от 14 000 ₽/мес',
    priceMin: 14000,
    priceMax: 22000,
    features: ['Покос каждую неделю', 'Скарификация', 'Обслуживание клумб', 'Подкормка газона'],
  },
  premium: {
    code: 'premium',
    name: 'Премиум',
    short: '💎 Премиум — от 25 000 ₽/мес',
    priceMin: 25000,
    priceMax: 45000,
    features: ['Покос каждую неделю', 'Скарификация и аэрация', 'Обслуживание бассейна', 'Подрезка кустарников', 'Полив по графику'],
  },
};

/** Какие "экстра" опции уместны для конкретного материала. */
export function extrasForMaterial(mk: MaterialKind): { pump: boolean; manipulator: boolean; deliveryOnly: boolean } {
  if (mk === 'concrete') return { pump: true, manipulator: true, deliveryOnly: true };
  if (mk === 'crushed_stone' || mk === 'sand') return { pump: false, manipulator: true, deliveryOnly: true };
  if (mk === 'cement' || mk === 'brick') return { pump: false, manipulator: true, deliveryOnly: false };
  return { pump: false, manipulator: false, deliveryOnly: false };
}

export type StatusUi = { icon: string; label: string };

export const STATUS_UI: Record<string, StatusUi> = {
  new: { icon: '🟡', label: 'Принят, обрабатываем' },
  qualifying: { icon: '🟡', label: 'Уточняем детали' },
  qualified: { icon: '🟡', label: 'Уточняем детали' },
  quoted: { icon: '🟢', label: 'Цена согласована' },
  scheduled: { icon: '🟢', label: 'Мастер приедет' },
  in_progress: { icon: '🔵', label: 'Мастер на объекте' },
  done: { icon: '✅', label: 'Выполнен' },
  lost: { icon: '⚪️', label: 'Отменён' },
  archived: { icon: '⚪️', label: 'В архиве' },
};

export function districtName(code?: string): string | undefined {
  if (!code) return undefined;
  return DISTRICTS.find((d) => d.code === code)?.name;
}

export function mapStatusToUi(status: string): StatusUi {
  return STATUS_UI[status] ?? STATUS_UI.new!;
}

export function canCancelStatus(status: string): boolean {
  return ['new', 'qualifying', 'qualified', 'quoted', 'scheduled'].includes(status);
}

export function canEditDateStatus(status: string): boolean {
  return ['new', 'qualifying', 'qualified', 'quoted', 'scheduled'].includes(status);
}

export function parseArea(input: string): { value: number; unit: string } | null {
  const cleaned = input.toLowerCase().replace(',', '.').trim();
  const m = cleaned.match(/(\d+(?:\.\d+)?)\s*(сот|м2|м²|кв|кв\.?м|га)?/);
  if (!m) return null;
  const value = parseFloat(m[1]!);
  const unitRaw = m[2] ?? '';
  let unit = 'сотка';
  if (/м2|м²|кв/.test(unitRaw)) unit = 'м2';
  else if (/га/.test(unitRaw)) unit = 'га';
  return { value, unit };
}

export function parseAreaBucket(callbackData: string): { bucket: string; min: number; max: number; unit: string } | null {
  const m = callbackData.match(/^area:[^:]+:(\d+|custom)$/);
  if (!m) return null;
  if (m[1] === 'custom') return null;
  const top = parseInt(m[1]!, 10);
  let min = 0, max = top;
  if (top === 10) { min = 5; max = 10; }
  else if (top === 20) { min = 10; max = 20; }
  else if (top === 30) { min = 20; max = 30; }
  return { bucket: m[1]!, min, max, unit: 'сотка' };
}

export function whenLabelToRange(
  label: string,
  today: Date = new Date(),
): { from: string; to: string; human: string } | null {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const t = new Date(today);
  switch (label) {
    case 'today':
      return { from: fmt(t), to: fmt(t), human: 'сегодня' };
    case 'tomorrow': {
      const x = new Date(t);
      x.setDate(t.getDate() + 1);
      return { from: fmt(x), to: fmt(x), human: 'завтра' };
    }
    case 'weekend': {
      const day = t.getDay();
      const sat = new Date(t);
      sat.setDate(t.getDate() + ((6 - day + 7) % 7));
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      return { from: fmt(sat), to: fmt(sun), human: 'эти выходные' };
    }
    case 'thisweek': {
      const end = new Date(t);
      end.setDate(t.getDate() + (7 - t.getDay()));
      return { from: fmt(t), to: fmt(end), human: 'на этой неделе' };
    }
    default:
      return null;
  }
}

export function estimatePriceRange(k: BotServiceKind, units: number): { low: number; high: number } {
  const r = PRICE_RANGE[k] ?? { min: 0, max: 0, minOrder: 0 };
  const low = Math.max(r.minOrder ?? 0, Math.round(r.min * units));
  const high = Math.max(r.minOrder ?? 0, Math.round(r.max * units));
  return { low, high };
}

export function applyDiscountToRange(
  price: { low: number; high: number },
  percent: number,
  bonusRub: number,
): { low: number; high: number } {
  const after = (n: number) => Math.max(0, Math.round(n * (1 - percent / 100)) - bonusRub);
  return { low: after(price.low), high: after(price.high) };
}

export function formatRub(n: number): string {
  return n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
}

export function formatDateRange(from?: string | null, to?: string | null): string {
  if (!from) return '';
  if (!to || to === from) return formatDate(from);
  return `${formatDate(from)} — ${formatDate(to)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function areaQuestion(k: BotServiceKind): string {
  if (['lawn_mowing', 'scarification', 'aeration', 'land_clearing'].includes(k))
    return 'Какая площадь участка?';
  if (['pool_cleaning', 'pool_assembly'].includes(k))
    return 'Какой размер бассейна?';
  if (['tree_cutting'].includes(k))
    return 'Сколько деревьев нужно спилить?';
  if (['stump_removal'].includes(k))
    return 'Сколько пней?';
  return 'Опишите параметры объекта.';
}

/** UI texts used by webhook handlers */
export const UI = {
  homeWelcome: (name?: string) =>
    `👋 ${name ? name + ', ' : ''}выберите раздел или напишите, что нужно сделать.\n\n` +
    `Я помогу быстро заказать работы по дому и участку.`,
  homeWelcomeB2b: (name?: string) =>
    `👋 ${name ? name + ', ' : ''}выберите раздел или напишите, что нужно.\n\n` +
    `Менеджер подготовит КП и счёт по первому запросу.`,
  homeMenu: 'Что вас интересует?',
  servicesMenuIntro: '🛠 <b>Услуги</b>\n\nВыберите, что нужно сделать:',
  servicesMenuIntroB2b:
    '🛠 <b>Услуги для компаний</b>\n\nЦены ориентировочные — менеджер подготовит КП по факту объёмов:',
  subscriptionsIntro: (regionLabel: string) =>
    `📅 <b>Абонентское обслуживание</b>\n\n` +
    `Выезжаем по графику — вы не вспоминаете, когда вызывать мастера. Регион: ${regionLabel}.\n\n` +
    `Выберите пакет:`,
  subscriptionPlanCard: (p: SubscriptionPlan) =>
    `<b>${p.name} — ${formatRub(p.priceMin)}–${formatRub(p.priceMax)} ₽/мес</b>\n\n` +
    p.features.map((f) => `• ${f}`).join('\n'),
  subscriptionConfirm: (p: { plan: string; period: string; district?: string; address?: string; priceLow: number; priceHigh: number }) => {
    const lines: string[] = ['✅ <b>Проверьте абонемент</b>\n'];
    lines.push(`Пакет: <b>${p.plan}</b>`);
    lines.push(`Период: ${p.period}`);
    if (p.district) lines.push(`Район: ${p.district}`);
    if (p.address) lines.push(`Адрес: ${p.address}`);
    lines.push(`\nЦена: ${formatRub(p.priceLow)}–${formatRub(p.priceHigh)} ₽/мес`);
    lines.push('\nТочную цену зафиксируем после первого выезда.');
    return lines.join('\n');
  },
  subscriptionThanks: (p: { humanId: string; plan: string }) =>
    `✅ <b>Заявка #${p.humanId} принята</b>\n\n` +
    `Абонемент: ${p.plan}\n\n` +
    `Менеджер свяжется с вами в течение 30 минут — согласует график и подпишет договор.`,
  regionPickerIntro: (current: string) =>
    `📍 <b>Регион обслуживания</b>\n\nСейчас выбран: <b>${current}</b>.\n\nВ каком городе оформляем заказ?`,
  regionChanged: (label: string) => `📍 Регион обновлён: <b>${label}</b>.`,
  extrasIntro: (mk: string) =>
    `Дополнительно для <b>${mk}</b>:\n\n` +
    `Отметьте всё, что нужно (можно несколько). Когда закончите — нажмите «Готово».`,

  serviceSelected: (k: BotServiceKind) =>
    `Отлично, оформляем <b>«${SERVICE_LABEL[k]}»</b>.\n` +
    `Ориентир по цене: ${PRICE_HINT[k]}.\n\n` +
    `Подскажите, пожалуйста, ${areaQuestion(k)}`,

  askDistrict: 'В каком районе участок?',
  askWhen: 'Когда удобно приехать?',
  askPhotos: 'Если есть, отправьте 1–3 фото объекта. Или нажмите «Пропустить».',
  askPhone: 'И последний шаг — телефон, чтобы мастер связался для подтверждения.',

  confirm: (p: {
    service: string; area?: string; district?: string; when?: string;
    priceLow: number; priceHigh: number;
    discountPercent?: number; bonusRub?: number;
    finalLow?: number; finalHigh?: number;
  }) => {
    const lines: string[] = ['✅ <b>Проверьте, всё верно?</b>\n'];
    lines.push(`Услуга: <b>${p.service}</b>`);
    if (p.area) lines.push(`Объём: ${p.area}`);
    if (p.district) lines.push(`Район: ${p.district}`);
    if (p.when) lines.push(`Когда: ${p.when}`);
    lines.push(`\nЦена: ${formatRub(p.priceLow)}–${formatRub(p.priceHigh)} ₽`);
    if (p.discountPercent || p.bonusRub) {
      const parts: string[] = [];
      if (p.discountPercent) parts.push(`−${p.discountPercent}%`);
      if (p.bonusRub) parts.push(`−${p.bonusRub} ₽`);
      lines.push(`🎁 Скидка: ${parts.join(' и ')}`);
      if (p.finalLow != null && p.finalHigh != null) {
        lines.push(`Итого: ${formatRub(p.finalLow)}–${formatRub(p.finalHigh)} ₽`);
      }
    }
    return lines.join('\n');
  },

  thanks: (p: { humanId: string; service: string; when?: string; district?: string }) =>
    `✅ <b>Заявка #${p.humanId} принята</b>\n\n` +
    `Услуга: ${p.service}\n` +
    (p.when ? `Когда: ${p.when}\n` : '') +
    (p.district ? `Район: ${p.district}\n` : '') +
    `\nМастер свяжется с вами в течение 30 минут.`,

  myOrdersEmpty: 'У вас пока нет заказов. Хотите оформить?',

  orderCard: (o: {
    humanId: string; serviceName: string;
    statusIcon: string; statusLabel: string;
    when?: string; district?: string; area?: string;
    priceQuoted?: number; discountPercent?: number;
  }) => {
    const lines: string[] = [`${o.statusIcon} <b>Заказ #${o.humanId} — ${o.serviceName}</b>\n`];
    if (o.when) lines.push(`Дата: ${o.when}`);
    const place = [o.district, o.area].filter(Boolean).join(', ');
    if (place) lines.push(`Адрес: ${place}`);
    lines.push(`Статус: ${o.statusLabel}`);
    if (o.priceQuoted) {
      lines.push(`\nЦена: ~${formatRub(o.priceQuoted)} ₽`);
      if (o.discountPercent) {
        const final = Math.round(o.priceQuoted * (1 - o.discountPercent / 100));
        lines.push(`🎁 Со скидкой: ~${formatRub(final)} ₽`);
      }
    }
    return lines.join('\n');
  },

  referralIntro: (p: { link: string; invited: number; balance: number }) =>
    `🎁 <b>Пригласите друга — получите 500 ₽ скидки</b>\n\n` +
    `Как работает:\n` +
    `1. Отправьте другу свою ссылку.\n` +
    `2. Он заказывает любую услугу.\n` +
    `3. Когда мастер выполнит работу — вам и другу по 500 ₽ на следующий заказ.\n\n` +
    `Ваша ссылка:\n<code>${p.link}</code>\n\n` +
    `Друзей пригласили: ${p.invited}\n` +
    `Баланс: ${p.balance} ₽\n\n` +
    `📢 Приглашайте друзей — копируйте ссылку выше и отправляйте.\n` +
    `Они подпишутся на канал и получат 500 ₽ на первый заказ.`,

  referralActivated: (referrerName?: string) =>
    `🎁 <b>Вы получили 500 ₽ на первый заказ!</b>\n\n` +
    `${referrerName ?? 'Друг'} пригласил вас в Подряд PRO — вам обоим по 500 ₽ бонуса на заказы.\n\n` +
    `Подпишитесь на канал, чтобы активировать бонус и быть в курсе акций:`,

  helpText:
    `ℹ️ <b>Как это работает</b>\n\n` +
    `1. Выберите услугу.\n` +
    `2. Ответьте на 3–4 коротких вопроса.\n` +
    `3. Мастер позвонит подтвердить время и цену.\n` +
    `4. После работы оплачиваете на месте.\n\n` +
    `Вопросы? Напишите оператору — мы рядом.`,

  operatorText:
    `Передаю вас оператору 👨‍🔧\n` +
    `Напишите, что вас интересует — и оставьте номер. Перезвоним в течение 30 минут (9:00–21:00).`,

  unknown: 'Не уловил вопрос 🙈 Воспользуйтесь меню ниже или напишите оператору.',

  // ── Region ──
  askRegion: (name?: string) =>
    `👋 Здравствуйте${name ? ', ' + name : ''}!\n\n` +
    `Я — бот <b>«${BRAND_NAME}»</b>. Помогаю быстро заказать работы по дому и участку, стройматериалы.\n\n` +
    `📍 <b>В каком городе вы находитесь?</b>`,

  // ── Customer type ──
  askCustomerType: (name?: string) =>
    `👋 Здравствуйте${name ? ', ' + name : ''}!\n\n` +
    `Я — бот <b>«${BRAND_NAME}»</b>. Чтобы предложить подходящее меню — подскажите:\n` +
    `вы оформляете заказ для частного дома или для компании / стройки?`,

  // ── Materials ──
  materialsMenu: (isB2b?: boolean) =>
    `🧱 <b>Стройматериалы</b>\n\n` +
    `Мы возим:\n` +
    `• бетон любых марок (M100–M400)\n` +
    `• щебень всех фракций\n` +
    `• песок (карьерный, речной, мытый)\n` +
    `• цемент M400/M500\n` +
    `• кирпич — рядовой, облицовочный, силикатный\n\n` +
    `Что нужно?${isB2b ? '\n\n(Оформление по договору, менеджер подготовит КП)' : ''}`,

  materialSelected: (k: MaterialKind) =>
    `<b>${MATERIAL_LABEL[k]}</b>\n${MATERIAL_DESC[k]}\n\nВыберите марку/фракцию:`,

  askMaterialQty: (unit: string) =>
    `Сколько нужно? (в ${unit})`,

  askDeliveryAddress: 'Адрес доставки?',

  materialConfirm: (p: {
    material: string; grade: string; qty: number; unit: string; when?: string;
    priceLow: number; priceHigh: number; address?: string;
  }) => {
    const lines: string[] = ['✅ <b>Проверьте заказ</b>\n'];
    lines.push(`Материал: <b>${p.material} ${p.grade}</b>`);
    lines.push(`Количество: ${p.qty} ${p.unit}`);
    if (p.address) lines.push(`Адрес доставки: ${p.address}`);
    if (p.when) lines.push(`Когда: ${p.when}`);
    lines.push(`\nЦена: ${formatRub(p.priceLow)}–${formatRub(p.priceHigh)} ₽ за ${p.unit}`);
    lines.push(`Примерный итог: ${formatRub(p.priceLow * p.qty)}–${formatRub(p.priceHigh * p.qty)} ₽`);
    lines.push(`\nТочную цену скажет менеджер при подтверждении.`);
    return lines.join('\n');
  },

  materialThanks: (p: { humanId: string; material: string; grade: string }) =>
    `✅ <b>Заявка #${p.humanId} принята</b>\n\n` +
    `Материал: ${p.material} ${p.grade}\n\n` +
    `Менеджер свяжется с вами в течение 30 минут для подтверждения заказа и расчёта доставки.`,
} as const;
