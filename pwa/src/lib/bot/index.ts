// Bot integration — barrel export
export type { BotServiceKind, Screen, OrderStep, SessionState } from './types';
export {
  SERVICE_LABEL,
  PRICE_HINT,
  PRICE_RANGE,
  DISTRICTS,
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
} from './order-flow';
export type { ChannelName } from './order-flow';

export {
  ensureReferralCode,
  recordReferralVisit,
  getReferralLink,
  getReferralStats,
} from './loyalty';

export { rpc, query, querySingle, insert, update as dbUpdate } from './supabase';
