// Inline keyboard builders for Telegram and MAX
import type { MessageButton } from '@/lib/channels/types';
import {
  SERVICE_LABEL, DISTRICTS, MATERIAL_LABEL, MATERIAL_GRADES,
  SUBSCRIPTION_PLANS, REGION_LABEL, extrasForMaterial,
} from './funnel-state';
import type { BotServiceKind, MaterialKind, RegionCode, SubscriptionPlanCode, SessionState } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryad.pro';

const BACK_BTN: MessageButton = { type: 'callback', text: '◀️ Назад', callback_data: 'nav:back' };
const HOME_BTN: MessageButton = { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' };

/** Bottom row: back + home shortcuts. */
function navRow(includeHome = true): MessageButton[] {
  return includeHome ? [BACK_BTN, HOME_BTN] : [BACK_BTN];
}

/** Main menu — B2C version (services first). */
export function mainMenuButtons(region: RegionCode = 'omsk'): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '🛠 Услуги', callback_data: 'menu:services' },
      { type: 'callback', text: '🧱 Материалы', callback_data: 'menu:materials' },
    ],
    [
      { type: 'callback', text: '📋 Мои заказы', callback_data: 'menu:my_orders' },
      { type: 'callback', text: '🎁 Друзьям +500 ₽', callback_data: 'menu:referral' },
    ],
    [
      { type: 'callback', text: '📅 Абонентка', callback_data: 'menu:subscription' },
      { type: 'callback', text: `📍 Регион: ${REGION_LABEL[region]}`, callback_data: 'menu:region' },
    ],
    [
      { type: 'callback', text: '❔ Помощь', callback_data: 'menu:help' },
      { type: 'callback', text: '☎️ Оператор', callback_data: 'menu:operator' },
    ],
    [
      { type: 'callback', text: '🔄 Я бизнес', callback_data: 'ctype:b2b' },
      { type: 'url', text: '🌐 Сайт', url: APP_URL },
    ],
  ];
}

/** B2B main menu (materials first, contract/invoice prominent). */
export function mainMenuB2bButtons(region: RegionCode = 'omsk'): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '🧱 Материалы', callback_data: 'menu:materials' },
      { type: 'callback', text: '🛠 Услуги', callback_data: 'menu:services' },
    ],
    [
      { type: 'callback', text: '📋 Мои заказы', callback_data: 'menu:my_orders' },
      { type: 'callback', text: '🎁 Партнёрам', callback_data: 'menu:referral' },
    ],
    [
      { type: 'callback', text: '🤝 Договор / счёт', callback_data: 'menu:contract' },
      { type: 'callback', text: '☎️ Менеджер', callback_data: 'menu:operator' },
    ],
    [
      { type: 'callback', text: `📍 Регион: ${REGION_LABEL[region]}`, callback_data: 'menu:region' },
      { type: 'callback', text: '🔄 Я частник', callback_data: 'ctype:b2c' },
    ],
  ];
}

/** B2C/B2B picker — shown on first /start */
export function customerTypeButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '🏡 Для частного дома', callback_data: 'ctype:b2c' },
    ],
    [
      { type: 'callback', text: '🏗 Для компании / стройки', callback_data: 'ctype:b2b' },
    ],
  ];
}

/** Region picker (also used inline for /menu region toggle). */
export function regionButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '📍 Омск', callback_data: 'region:omsk' },
      { type: 'callback', text: '📍 Новосибирск', callback_data: 'region:novosibirsk' },
    ],
    navRow(),
  ];
}

/** Full 12-service catalog used for both B2C and B2B (B2B differs only in confirm CTA). */
export function serviceSelectionButtons(): MessageButton[][] {
  const layout: Array<[BotServiceKind, string]> = [
    ['lawn_mowing',      '🌱 Покос газона'],
    ['weed_removal',     '🌾 Удаление сорняков'],
    ['debris_removal',   '🚮 Вывоз мусора'],
    ['land_clearing',    '🪓 Расчистка участка'],
    ['tree_cutting',     '🪚 Спил деревьев'],
    ['tilling',          '🚜 Вспашка'],
    ['pool_cleaning',    '🏊 Чистка бассейна'],
    ['welding',          '🔥 Сварочные работы'],
    ['scarification',    '🌿 Скарификация'],
    ['aeration',         '🌬 Аэрация'],
    ['pool_assembly',    '🏗 Сборка бассейна'],
    ['pool_maintenance', '💦 Обслуживание бассейна'],
  ];

  const rows: MessageButton[][] = [];
  for (let i = 0; i < layout.length; i += 2) {
    const [k1, t1] = layout[i]!;
    const row: MessageButton[] = [{ type: 'callback', text: t1, callback_data: `svc:${k1}` }];
    if (layout[i + 1]) {
      const [k2, t2] = layout[i + 1]!;
      row.push({ type: 'callback', text: t2, callback_data: `svc:${k2}` });
    }
    rows.push(row);
  }
  rows.push([{ type: 'callback', text: '📅 Абонентка', callback_data: 'menu:subscription' }]);
  rows.push(navRow());
  return rows;
}

/** Area bucket buttons. */
export function areaButtons(serviceKind: string): MessageButton[][] {
  const prefix = `area:${serviceKind}`;
  return [
    [
      { type: 'callback', text: 'До 5 соток', callback_data: `${prefix}:5` },
      { type: 'callback', text: '5–10 соток', callback_data: `${prefix}:10` },
    ],
    [
      { type: 'callback', text: '10–20 соток', callback_data: `${prefix}:20` },
      { type: 'callback', text: '20+ соток', callback_data: `${prefix}:30` },
    ],
    [
      { type: 'callback', text: '✏️ Другой размер', callback_data: `${prefix}:custom` },
    ],
    navRow(),
  ];
}

/** District selection buttons. */
export function districtButtons(): MessageButton[][] {
  const rows: MessageButton[][] = [];
  for (let i = 0; i < DISTRICTS.length; i += 2) {
    const row: MessageButton[] = [];
    row.push({
      type: 'callback',
      text: DISTRICTS[i]!.name,
      callback_data: `district:${DISTRICTS[i]!.code}`,
    });
    if (DISTRICTS[i + 1]) {
      row.push({
        type: 'callback',
        text: DISTRICTS[i + 1]!.name,
        callback_data: `district:${DISTRICTS[i + 1]!.code}`,
      });
    }
    rows.push(row);
  }
  rows.push(navRow());
  return rows;
}

/** When selection buttons. */
export function whenButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: 'Сегодня', callback_data: 'when:today' },
      { type: 'callback', text: 'Завтра', callback_data: 'when:tomorrow' },
    ],
    [
      { type: 'callback', text: 'На выходных', callback_data: 'when:weekend' },
      { type: 'callback', text: 'На неделе', callback_data: 'when:thisweek' },
    ],
    [{ type: 'callback', text: '✏️ Другая дата', callback_data: 'when:custom' }],
    navRow(),
  ];
}

/** Confirm — different CTA for B2C vs B2B (KP request). */
export function confirmButtons(isB2b = false): MessageButton[][] {
  return [
    [
      isB2b
        ? { type: 'callback', text: '🤝 Запросить КП', callback_data: 'confirm:yes' }
        : { type: 'callback', text: '✅ Подтвердить', callback_data: 'confirm:yes' },
    ],
    [
      { type: 'callback', text: '🔄 Начать заново', callback_data: 'confirm:edit' },
      { type: 'callback', text: '❌ Отмена', callback_data: 'confirm:cancel' },
    ],
  ];
}

/** Post-order buttons. */
export function postOrderButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '📋 Мои заказы', callback_data: 'menu:my_orders' },
      { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' },
    ],
  ];
}

/** Order card action buttons. */
export function orderCardButtons(leadId: string, status: string): MessageButton[][] {
  const buttons: MessageButton[][] = [];
  const canEdit = ['new', 'qualifying', 'qualified', 'quoted', 'scheduled'].includes(status);

  buttons.push([
    { type: 'callback', text: '🔁 Повторить заказ', callback_data: `order:${leadId}:repeat` },
  ]);
  if (canEdit) {
    buttons.push([
      { type: 'callback', text: '📅 Изменить дату', callback_data: `order:${leadId}:edit_date` },
    ]);
  }
  if (canEdit) {
    buttons.push([
      { type: 'callback', text: '❌ Отменить заказ', callback_data: `order:${leadId}:cancel` },
    ]);
  }
  buttons.push([
    { type: 'callback', text: '◀️ Назад к списку', callback_data: 'menu:my_orders' },
    { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' },
  ]);
  return buttons;
}

/** My Orders list buttons (handles both service leads and material orders via v_my_all_orders). */
export function myOrdersButtons(
  orders: Array<{ kind?: string; id: string; human_id?: string; service_short?: string; title?: string; status?: string }>,
): MessageButton[][] {
  const buttons: MessageButton[] = orders.map((o) => {
    const statusIcon = o.status === 'done' ? '✅' : o.status === 'lost' || o.status === 'cancelled' ? '❌' : '🟡';
    const label = o.title ?? o.service_short ?? '';
    return {
      type: 'callback',
      text: `${statusIcon} #${o.human_id ?? String(o.id).slice(0, 8)} — ${label}`,
      callback_data: o.kind === 'material'
        ? `morder:${o.id}:view`
        : `order:${o.id}:view`,
    };
  });
  const rows: MessageButton[][] = buttons.map((b) => [b]);
  rows.push([
    { type: 'callback', text: '◀️ Назад', callback_data: 'nav:back' },
    { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' },
  ]);
  return rows;
}

/** Referral program buttons. */
export function referralButtons(): MessageButton[][] {
  return [
    [{ type: 'callback', text: '👥 Мои рефералы', callback_data: 'menu:referral_list' }],
    [
      { type: 'callback', text: '◀️ Назад', callback_data: 'nav:back' },
      { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' },
    ],
  ];
}

/** Single back-to-home row. */
export function backToHomeButton(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '◀️ Назад', callback_data: 'nav:back' },
      { type: 'callback', text: '🏠 В меню', callback_data: 'nav:home' },
    ],
  ];
}

// ── Material-specific keyboards ────────────────────────────

/** Materials menu — 5 material types. */
export function materialsMenuButtons(): MessageButton[][] {
  const layout: Array<[MaterialKind, string]> = [
    ['crushed_stone', '🪨 Щебень'],
    ['sand',          '🌾 Песок'],
    ['concrete',      '🏗 Бетон'],
    ['cement',        '🧊 Цемент'],
    ['brick',         '🧱 Кирпич'],
  ];
  const rows: MessageButton[][] = [];
  for (let i = 0; i < layout.length; i += 2) {
    const [k1, t1] = layout[i]!;
    const row: MessageButton[] = [{ type: 'callback', text: t1, callback_data: `mat:${k1}` }];
    if (layout[i + 1]) {
      const [k2, t2] = layout[i + 1]!;
      row.push({ type: 'callback', text: t2, callback_data: `mat:${k2}` });
    }
    rows.push(row);
  }
  rows.push(navRow());
  return rows;
}

/** Grade selection for a specific material. */
export function gradeButtons(materialKind: MaterialKind): MessageButton[][] {
  const grades = MATERIAL_GRADES[materialKind];
  const rows: MessageButton[][] = [];
  for (const g of grades) {
    rows.push([{
      type: 'callback',
      text: g.priceHint ? `${g.name} • ${g.priceHint}` : g.name,
      callback_data: `grade:${materialKind}:${g.code}`,
    }]);
  }
  if (materialKind === 'concrete') {
    rows.push([{ type: 'callback', text: '🤷 Не знаю / посоветуйте', callback_data: `grade:${materialKind}:unknown` }]);
  }
  rows.push(navRow());
  return rows;
}

/** Quantity bucket buttons (unit-aware). */
export function materialQtyButtons(unit: string): MessageButton[][] {
  const u = unit.toLowerCase();
  const isM3 = u === 'м³' || u === 'м3';
  const isTon = u === 'т';
  const isBag = u === 'меш';
  if (isM3) {
    return [
      [
        { type: 'callback', text: '1–3 м³', callback_data: 'qty:3' },
        { type: 'callback', text: '4–6 м³', callback_data: 'qty:6' },
      ],
      [
        { type: 'callback', text: '7–10 м³', callback_data: 'qty:10' },
        { type: 'callback', text: '10+ м³', callback_data: 'qty:15' },
      ],
      [{ type: 'callback', text: '✏️ Указать точно', callback_data: 'qty:custom' }],
      navRow(),
    ];
  }
  if (isTon) {
    return [
      [
        { type: 'callback', text: '1–5 т', callback_data: 'qty:5' },
        { type: 'callback', text: '5–15 т', callback_data: 'qty:15' },
      ],
      [
        { type: 'callback', text: '15–30 т', callback_data: 'qty:30' },
        { type: 'callback', text: '30+ т', callback_data: 'qty:40' },
      ],
      [{ type: 'callback', text: '✏️ Указать точно', callback_data: 'qty:custom' }],
      navRow(),
    ];
  }
  if (isBag) {
    return [
      [
        { type: 'callback', text: '10 мешков', callback_data: 'qty:10' },
        { type: 'callback', text: '30 мешков', callback_data: 'qty:30' },
      ],
      [
        { type: 'callback', text: '60 мешков', callback_data: 'qty:60' },
        { type: 'callback', text: 'Поддон (1 т)', callback_data: 'qty:40' },
      ],
      [{ type: 'callback', text: '✏️ Указать точно', callback_data: 'qty:custom' }],
      navRow(),
    ];
  }
  return [
    [
      { type: 'callback', text: 'До 50 шт', callback_data: 'qty:50' },
      { type: 'callback', text: '50–200 шт', callback_data: 'qty:200' },
    ],
    [
      { type: 'callback', text: '200–1000 шт', callback_data: 'qty:1000' },
      { type: 'callback', text: '1000+ шт', callback_data: 'qty:2000' },
    ],
    [{ type: 'callback', text: '✏️ Указать точно', callback_data: 'qty:custom' }],
    navRow(),
  ];
}

/** Multi-select extras for material delivery. */
export function extrasButtons(state: SessionState): MessageButton[][] {
  const mk = state.materialKind ?? 'concrete';
  const allowed = extrasForMaterial(mk);
  const mark = (v: boolean | undefined) => (v ? '✓' : '☐');
  const rows: MessageButton[][] = [];
  if (allowed.pump) {
    rows.push([{
      type: 'callback',
      text: `${mark(state.needsPump)} Нужен бетононасос`,
      callback_data: 'extra:pump',
    }]);
  }
  if (allowed.manipulator) {
    rows.push([{
      type: 'callback',
      text: `${mark(state.needsManipulator)} Нужен манипулятор`,
      callback_data: 'extra:manip',
    }]);
  }
  if (allowed.deliveryOnly) {
    rows.push([{
      type: 'callback',
      text: `${mark(state.deliveryOnly)} Только разгрузка с борта`,
      callback_data: 'extra:delivery_only',
    }]);
  }
  rows.push([{ type: 'callback', text: '➡️ Готово', callback_data: 'extra:done' }]);
  rows.push(navRow());
  return rows;
}

/** Subscription plan picker. */
export function subscriptionPlansButtons(): MessageButton[][] {
  const codes: SubscriptionPlanCode[] = ['basic', 'comfort', 'premium'];
  const rows: MessageButton[][] = codes.map((c) => [{
    type: 'callback' as const,
    text: SUBSCRIPTION_PLANS[c].short,
    callback_data: `sub:plan:${c}`,
  }]);
  rows.push([{ type: 'callback', text: '❔ Что входит', callback_data: 'sub:info' }]);
  rows.push(navRow());
  return rows;
}

/** Subscription period picker. */
export function subscriptionPeriodButtons(): MessageButton[][] {
  return [
    [{ type: 'callback', text: 'Сезон (апрель–октябрь)', callback_data: 'sub:period:season' }],
    [{ type: 'callback', text: 'Полгода', callback_data: 'sub:period:half_year' }],
    [{ type: 'callback', text: '3 месяца', callback_data: 'sub:period:3_months' }],
    navRow(),
  ];
}
