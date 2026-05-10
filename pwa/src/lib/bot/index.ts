// Bot integration — barrel export
export type { BotServiceKind, MaterialKind, RegionCode, CustomerType, Screen, OrderStep, SessionState, SubscriptionPlanCode } from './types';
export {
  BRAND_NAME,
  SERVICE_LABEL,
  PRICE_HINT,
  PRICE_RANGE,
  DISTRICTS,
  REGION_LABEL,
  REGION_PRICE_MULT,
  MATERIAL_LABEL,
  MATERIAL_DESC,
  MATERIAL_UNIT,
  MATERIAL_GRADES,
  MATERIAL_PRICE_RANGE,
  SUBSCRIPTION_PLANS,
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
  extrasForMaterial,
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
  extrasButtons,
  subscriptionPlansButtons,
  subscriptionPeriodButtons,
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
  listMyAllOrders,
  getBotOrder,
  cancelBotOrder,
  updateBotOrderDate,
  repeatBotOrder,
  createMaterialOrder,
  notifyN8n,
  setContactRegion,
  getContactRegion,
  setCustomerType,
  getContactCustomerType,
} from './order-flow';
export type { ChannelName } from './order-flow';

export {
  ensureReferralCode,
  recordReferralVisit,
  getReferralLink,
  getReferralStats,
} from './loyalty';

export { rpc, query, querySingle, insert, update as dbUpdate } from './supabase';
