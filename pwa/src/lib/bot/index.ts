// Bot integration — barrel export
export type { BotServiceKind, MaterialKind, RegionCode, CustomerType, Screen, OrderStep, SessionState } from './types';
export {
  SERVICE_LABEL,
  PRICE_HINT,
  PRICE_RANGE,
  DISTRICTS,
  REGION_LABEL,
  MATERIAL_LABEL,
  MATERIAL_DESC,
  MATERIAL_UNIT,
  MATERIAL_GRADES,
  MATERIAL_PRICE_RANGE,
  STATUS_UI,
  UI,
  districtName,
  mapStatusToUi,
  canCancelStatus,
  canEditDateStatus,
  parseArea,
  parseAreaBucket,
  whenLabelToRange,
  estimatePriceRange,
  applyDiscountToRange,
  formatRub,
  formatDateRange,
} from './funnel-state';

export {
  mainMenuButtons,
  mainMenuB2bButtons,
  customerTypeButtons,
  regionButtons,
  serviceSelectionButtons,
  areaButtons,
  districtButtons,
  whenButtons,
  confirmButtons,
  postOrderButtons,
  orderCardButtons,
  myOrdersButtons,
  referralButtons,
  backToHomeButton,
  materialsMenuButtons,
  gradeButtons,
  materialQtyButtons,
} from './keyboards';

export {
  getOrCreateSession,
  updateSession,
  setSessionState,
  clearSession,
} from './session';
export type { BotSession } from './session';

export {
  getBotContact,
  createBotLead,
  computeDiscount,
  applyDiscountToLead,
  getPriceEstimate,
  getMyBotOrders,
  getBotOrder,
  cancelBotOrder,
  updateBotOrderDate,
  repeatBotOrder,
  createMaterialOrder,
} from './order-flow';
export type { ChannelName } from './order-flow';

export {
  ensureReferralCode,
  recordReferralVisit,
  getReferralLink,
  getReferralStats,
} from './loyalty';

export { rpc, query, querySingle, insert, update as dbUpdate } from './supabase';
