// Bot funnel shared types — adapted from Premium

export type BotServiceKind =
  | 'lawn_mowing'
  | 'scarification'
  | 'aeration'
  | 'land_clearing'
  | 'tree_cutting'
  | 'stump_removal'
  | 'debris_removal'
  | 'pool_cleaning'
  | 'pool_assembly'
  | 'weed_removal'
  | 'pool_maintenance'
  | 'welding'
  | 'tilling'
  | 'subscription';

export type Screen =
  | 'home'
  | 'order'
  | 'orders'
  | 'order_card'
  | 'repeat'
  | 'edit_date'
  | 'referral'
  | 'referral_list'
  | 'help'
  | 'operator';

export type OrderStep =
  | 'service'
  | 'params'
  | 'district'
  | 'when'
  | 'photos'
  | 'confirm'
  | 'phone'
  | 'done';

export type Step = OrderStep;

export type SessionState = {
  screen?: Screen;
  serviceKind?: BotServiceKind;
  serviceVariant?: 'scarification' | 'aeration' | 'scarification+aeration';
  poolKind?: 'pool_cleaning' | 'pool_assembly' | 'pool_winter' | 'pool_other';
  landSubtasks?: Array<'overgrowth' | 'tree' | 'stump' | 'debris'>;
  area?: number;
  areaUnit?: string;
  areaBucket?: string;
  district?: string;
  districtCode?: string;
  description?: string;
  mediaIds?: string[];
  whenLabel?: string;
  whenCustom?: string;
  whenHuman?: string;
  whenFrom?: string;
  whenTo?: string;
  phone?: string;
  discountPercent?: number;
  bonusRub?: number;
  activeLeadId?: string;
  referredBy?: string;
};
