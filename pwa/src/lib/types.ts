export type EscrowStatus = '' | 'payment_held' | 'in_progress' | 'pending_confirm' | 'completed' | 'disputed' | 'cancelled';
export type PayoutStatusEscrow = 'pending' | 'processing' | 'succeeded' | 'failed' | 'pending_manual';

export interface Order {
  /** Совпадает с TEXT в Supabase (в т.ч. префикс n8n-…). */
  order_id: string;
  customer_id: string;
  address: string;
  lat: number;
  lon: number;
  yandex_link: string;
  time: string;
  payment_text: string;
  people: number;
  hours: number;
  work_type: string;
  comment?: string;
  status: 'pending' | 'paid' | 'published' | 'closed' | 'cancelled' | 'done';
  executor_id?: string;
  message_id?: string;
  created_at: string;
  client_rate?: number;
  worker_rate?: number;
  client_total?: number;
  worker_payout?: number;
  margin?: number;
  payout_status?: string;
  payout_at?: string;
  max_posted?: boolean;
  max_message_id?: string;
  // Escrow fields (Phase 1)
  subtotal?: number;
  service_fee_rate?: number;
  service_fee?: number;
  combo_discount?: number;
  total?: number;
  payout_amount?: number;
  escrow_status?: EscrowStatus;
  yookassa_payment_id?: string;
  payment_captured?: boolean;
  payment_held_at?: string;
  payment_captured_at?: string;
  customer_confirmed?: boolean;
  customer_confirmed_at?: string;
  supplier_confirmed?: boolean;
  supplier_confirmed_at?: string;
  payout_status_escrow?: PayoutStatusEscrow;
  payout_id?: string;
  payout_method?: string;
  customer_phone?: string;
  customer_email?: string;
  // Markup model fields (Phase 2)
  customer_total?: number;
  supplier_payout?: number;
  platform_margin?: number;
  order_number?: string;
}

export interface Worker {
  telegram_id: string;
  username: string;
  name: string;
  phone: string;
  rating: number;
  jobs_count: number;
  white_list: boolean;
  is_vip: boolean;
  vip_expires_at?: string;
  skills: string;
  balance: number;
  ban_until?: string;
  created_at: string;
  is_selfemployed?: boolean;
  card_last4?: string;
  accepted_offer?: boolean;
  user_phone?: string;
  // Escrow payout fields (Phase 1)
  payout_card?: string;
  payout_card_synonym?: string;
  is_selfemployed_verified?: boolean;
}

export type EscrowLedgerType = 'hold' | 'capture' | 'release' | 'refund' | 'payout';

export interface EscrowLedgerEntry {
  id: string;
  order_id: string;
  type: EscrowLedgerType;
  amount: number;
  yookassa_operation_id?: string;
  note?: string;
  created_at: string;
}

export interface Listing {
  id: string;
  listing_type: string;
  category?: string;
  subcategory?: string;
  title: string;
  base_price: number;
  display_price: number;
  markup_percent: number;
  unit?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
}

export type DisputeResolution = 'refund_full' | 'refund_partial' | 'release_payment' | 'pending';

export interface Dispute {
  id: string;
  order_id: string;
  initiated_by: 'customer' | 'supplier';
  reason: string;
  description?: string;
  resolution?: DisputeResolution;
  resolved_at?: string;
  created_at: string;
}

// ── Platform Upgrade Types (2026-04-05) ───────────────────────

export type ContractorStatus = 'new' | 'verified' | 'active' | 'blocked';
export type PreferredContact = 'max' | 'telegram' | 'phone';
export type ContractorSource = 'pwa' | 'telegram' | 'max';
export type OrderLifecycleStatus =
  | 'pending'
  | 'priced'
  | 'payment_sent'
  | 'paid'
  | 'in_progress'
  | 'confirming'
  | 'completed'
  | 'disputed';

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  city: string;
  specialties: string[];
  experience?: string;
  preferred_contact: PreferredContact;
  about?: string;
  source: ContractorSource;
  telegram_id?: string;
  max_id?: string;
  email?: string;
  status: ContractorStatus;
  admin_notes?: string;
  created_at: string;
}

export interface CustomerToken {
  id: string;
  phone: string;
  access_token: string;
  preferred_contact: PreferredContact;
  messenger_id?: string;
  created_at: string;
}
