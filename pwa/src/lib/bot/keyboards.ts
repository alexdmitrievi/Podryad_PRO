// Inline keyboard builders for Telegram and MAX
// Adapted from Premium lib/telegram.ts and lib/max.ts

import type { MessageButton } from '@/lib/channels/types';
import { SERVICE_LABEL, DISTRICTS } from './funnel-state';
import type { BotServiceKind } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://podryadpro.ru';

/** Main menu — shown on /start or home screen */
export function mainMenuButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '🚀 Быстрый заказ', callback_data: 'menu:order' },
    ],
    [
      { type: 'callback', text: '📋 Мои заказы', callback_data: 'menu:my_orders' },
      { type: 'callback', text: '🎁 Рефералы', callback_data: 'menu:referral' },
    ],
    [
      { type: 'callback', text: '❓ Помощь', callback_data: 'menu:help' },
      { type: 'url', text: '🌐 Сайт', url: APP_URL },
    ],
  ];
}

/** Service selection keyboard */
export function serviceSelectionButtons(): MessageButton[][] {
  const services: BotServiceKind[] = [
    'lawn_mowing', 'land_clearing',
    'scarification', 'aeration', 'tree_cutting', 'stump_removal',
    'debris_removal', 'pool_cleaning', 'pool_assembly',
  ];

  const buttons: MessageButton[] = services.slice(0, 6).map((k) => ({
    type: 'callback' as const,
    text: SERVICE_LABEL[k],
    callback_data: `svc:${k}`,
  }));

  const buttons2: MessageButton[] = services.slice(6).map((k) => ({
    type: 'callback' as const,
    text: SERVICE_LABEL[k],
    callback_data: `svc:${k}`,
  }));

  return [
    buttons.slice(0, 3),
    buttons.slice(3, 6),
    buttons2,
    [{ type: 'callback', text: '↩ Назад', callback_data: 'menu:home' }],
  ];
}

/** Area bucket buttons (for lawn/clearing type services) */
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
      { type: 'callback', text: 'Другой размер', callback_data: `${prefix}:custom` },
      { type: 'callback', text: '↩ Назад', callback_data: 'menu:order' },
    ],
  ];
}

/** District selection buttons */
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
  rows.push([{ type: 'callback', text: '↩ Назад', callback_data: 'funnel:back' }]);
  return rows;
}

/** When selection buttons */
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
    [
      { type: 'callback', text: 'Другая дата', callback_data: 'when:custom' },
      { type: 'callback', text: '↩ Назад', callback_data: 'funnel:back' },
    ],
  ];
}

/** Confirm / Back buttons */
export function confirmButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '✅ Подтвердить', callback_data: 'confirm:yes' },
    ],
    [
      { type: 'callback', text: '🔄 Начать заново', callback_data: 'confirm:edit' },
      { type: 'callback', text: '❌ Отмена', callback_data: 'confirm:cancel' },
    ],
  ];
}

/** Post-order buttons (shown after order created) */
export function postOrderButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '📋 Мои заказы', callback_data: 'menu:my_orders' },
      { type: 'callback', text: '🏠 На главную', callback_data: 'menu:home' },
    ],
  ];
}

/** Order card action buttons */
export function orderCardButtons(leadId: string, status: string): MessageButton[][] {
  const buttons: MessageButton[][] = [];
  const canEdit = ['new', 'qualifying', 'qualified', 'quoted', 'scheduled'].includes(status);
  const canCancel = canEdit;

  buttons.push([
    { type: 'callback', text: '🔁 Повторить заказ', callback_data: `order:${leadId}:repeat` },
  ]);
  if (canEdit) {
    buttons.push([
      { type: 'callback', text: '📅 Изменить дату', callback_data: `order:${leadId}:edit_date` },
    ]);
  }
  if (canCancel) {
    buttons.push([
      { type: 'callback', text: '❌ Отменить заказ', callback_data: `order:${leadId}:cancel` },
    ]);
  }
  buttons.push([
    { type: 'callback', text: '↩ Назад к списку', callback_data: 'menu:my_orders' },
  ]);
  return buttons;
}

/** My Orders list buttons */
export function myOrdersButtons(orders: Array<{ id: string; human_id?: string; service_short?: string; status?: string }>): MessageButton[][] {
  const buttons: MessageButton[] = orders.map((o) => {
    const statusIcon = o.status === 'done' ? '✅' : o.status === 'lost' ? '❌' : '🟡';
    return {
      type: 'callback',
      text: `${statusIcon} #${o.human_id ?? String(o.id).slice(0, 8)} — ${o.service_short ?? ''}`,
      callback_data: `order:${o.id}:view`,
    };
  });
  const rows: MessageButton[][] = buttons.map((b) => [b]);
  rows.push([
    { type: 'callback', text: '🏠 На главную', callback_data: 'menu:home' },
  ]);
  return rows;
}

/** Referral program buttons */
export function referralButtons(): MessageButton[][] {
  return [
    [
      { type: 'callback', text: '👥 Мои рефералы', callback_data: 'menu:referral_list' },
    ],
    [
      { type: 'callback', text: '🏠 На главную', callback_data: 'menu:home' },
    ],
  ];
}

/** Back to main menu button */
export function backToHomeButton(): MessageButton[][] {
  return [
    [{ type: 'callback', text: '🏠 На главную', callback_data: 'menu:home' }],
  ];
}
