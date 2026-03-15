export interface Order {
  order_id: number;
  customer_id: string;
  address: string;
  lat: number;
  lon: number;
  yandex_link: string;
  time: string;
  payment: string;
  people: number;
  hours: number;
  work_type: string;
  comment?: string;
  status: 'pending' | 'published' | 'closed' | 'cancelled';
  executor_id?: string;
  message_id?: string;
  created_at: string;
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
  consecutive_low: number;
}
