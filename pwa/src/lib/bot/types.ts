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

export type MaterialKind =
  | 'concrete'
  | 'crushed_stone'
  | 'sand'
  | 'cement'
  | 'brick';

export type RegionCode = 'omsk' | 'novosibirsk';
export type CustomerType = 'b2c' | 'b2b';

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
  | 'operator'
  | 'material_order'
  | 'pick_ctype'
  | 'materials_menu';

export type OrderStep =
  | 'service'
  | 'params'
  | 'region'
  | 'district'
  | 'when'
  | 'photos'
  | 'confirm'
  | 'phone'
  | 'done';

export type Step = OrderStep;

export type MaterialOrderStep =
  | 'mat_kind'
  | 'mat_grade'
  | 'mat_qty'
  | 'mat_when'
  | 'mat_address'
  | 'mat_confirm'
  | 'mat_done';

export type SessionState = {
  screen?: Screen;
  serviceKind?: BotServiceKind;
  serviceVariant?: 'scarification' | 'aeration' | 'scarification+aeration';
  poolKind?: 'pool_cleaning' | 'pool_assembly' | 'pool_winter' | 'pool_other';
  landSubtasks?: Array<'overgrowth' | 'tree' | 'stump' | 'debris'>;
  area?: number;
  areaUnit?: string;
  areaBucket?: string;
  region?: RegionCode;
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
  customerType?: CustomerType;
  // Materials
  materialKind?: MaterialKind;
  materialGradeCode?: string;
  materialGradeName?: string;
  materialQty?: number;
  materialUnit?: string;
  deliveryAddress?: string;
  materialPriceLow?: number;
  materialPriceHigh?: number;
};
