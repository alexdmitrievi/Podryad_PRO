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
}

export interface Worker {
  telegram_id: string;
  username: string;
  name: string;
  phone: string;
  rating: number;
  jobs_count: number;
  white_list: string;
  is_vip: string;
  vip_expires_at?: string;
  skills: string;
  balance: number;
  ban_until?: string;
  created_at: string;
  is_selfemployed?: string;
  card_last4?: string;
  accepted_offer?: string;
}
