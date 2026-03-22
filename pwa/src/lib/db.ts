import type { Order } from './types';
import { getServiceClient } from './supabase';

const db = () => getServiceClient();

/** Приводит строку из Supabase к типу Order (order_id в БД — TEXT). */
export function orderFromDb(row: Record<string, unknown>): Order {
  const oid = row.order_id;
  return {
    order_id: typeof oid === 'string' ? parseInt(oid, 10) || 0 : Number(oid) || 0,
    customer_id: String(row.customer_id ?? ''),
    address: String(row.address ?? ''),
    lat: Number(row.lat) || 0,
    lon: Number(row.lon) || 0,
    yandex_link: String(row.yandex_link ?? ''),
    time: String(row.time ?? ''),
    payment_text: String(row.payment_text ?? ''),
    people: Number(row.people) || 0,
    hours: Number(row.hours) || 0,
    work_type: String(row.work_type ?? ''),
    comment: row.comment != null ? String(row.comment) : undefined,
    status: row.status as Order['status'],
    executor_id: row.executor_id != null ? String(row.executor_id) : undefined,
    message_id: row.message_id != null ? String(row.message_id) : undefined,
    created_at: row.created_at != null ? String(row.created_at) : '',
    client_rate: row.client_rate != null ? Number(row.client_rate) : undefined,
    worker_rate: row.worker_rate != null ? Number(row.worker_rate) : undefined,
    client_total: row.client_total != null ? Number(row.client_total) : undefined,
    worker_payout: row.worker_payout != null ? Number(row.worker_payout) : undefined,
    margin: row.margin != null ? Number(row.margin) : undefined,
    payout_status: row.payout_status != null ? String(row.payout_status) : undefined,
    payout_at: row.payout_at != null ? String(row.payout_at) : undefined,
    max_posted: Boolean(row.max_posted),
    max_message_id: row.max_message_id != null ? String(row.max_message_id) : undefined,
  };
}

// ── ЗАКАЗЫ ──

export async function getPublishedOrders() {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrderById(orderId: string) {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .single();
  if (error) return null;
  return data;
}

export async function getOrdersByCustomer(phone: string) {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq('customer_id', phone)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrdersByExecutor(phone: string) {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq('executor_id', phone)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createOrder(order: Record<string, unknown>) {
  const { data, error } = await db()
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(orderId: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('orders')
    .update(updates)
    .eq('order_id', orderId);
  if (error) throw error;
}

// ── ТАРИФЫ ──

export async function getRates() {
  const { data, error } = await db()
    .from('rates')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function getRateByWorkType(workType: string) {
  const { data, error } = await db()
    .from('rates')
    .select('*')
    .eq('work_type', workType)
    .single();
  if (error) return null;
  return data;
}

// ── ПОЛЬЗОВАТЕЛИ ──

export async function findUserByPhone(phone: string) {
  const { data, error } = await db()
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();
  if (error) return null;
  return data;
}

export async function createUser(user: {
  phone: string;
  name: string;
  password_hash: string;
  role: string;
}) {
  const { data, error } = await db()
    .from('users')
    .insert(user)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserLastLogin(phone: string) {
  await db()
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('phone', phone);
}

// ── ИСПОЛНИТЕЛИ ──

export async function getWorkerByTelegramId(telegramId: string) {
  const { data, error } = await db()
    .from('workers')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  if (error) return null;
  return data;
}

export interface WorkerStats {
  total_earned: number;
  pending_payout: number;
  paid_orders: number;
}

export async function getWorkerStats(telegramId: string): Promise<WorkerStats> {
  const { data, error } = await db()
    .from('orders')
    .select('worker_payout, payout_status')
    .eq('executor_id', telegramId)
    .eq('status', 'closed');
  if (error) throw error;

  let total_earned = 0;
  let pending_payout = 0;
  let paid_orders = 0;

  for (const o of data || []) {
    const payout = o.worker_payout != null ? Number(o.worker_payout) : 0;
    const ps = o.payout_status != null ? String(o.payout_status) : '';
    if (ps === 'paid') {
      total_earned += payout;
      paid_orders++;
    } else if (ps === 'pending' || !ps) {
      pending_payout += payout;
    }
  }

  return { total_earned, pending_payout, paid_orders };
}

export async function getWorkerByPhone(phone: string) {
  const { data, error } = await db()
    .from('workers')
    .select('*')
    .eq('phone', phone)
    .single();
  if (error) return null;
  return data;
}

export async function getTopWorkers(limit = 20) {
  const { data, error } = await db()
    .from('workers')
    .select('*')
    .eq('white_list', true)
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).filter(w => {
    if (w.ban_until && new Date(w.ban_until) > new Date()) return false;
    return true;
  });
}

export async function updateWorker(phone: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('workers')
    .update(updates)
    .eq('phone', phone);
  if (error) throw error;
}

// ── ТЕХНИКА ──

export async function getEquipment(category?: string) {
  let query = db().from('equipment').select('*');
  if (category) query = query.eq('category', category);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data || [];
}

export async function getEquipmentById(equipmentId: string) {
  const { data, error } = await db()
    .from('equipment')
    .select('*')
    .eq('equipment_id', equipmentId)
    .single();
  if (error) return null;
  return data;
}

export async function updateEquipmentStatus(equipmentId: string, status: string) {
  const { error } = await db()
    .from('equipment')
    .update({ status })
    .eq('equipment_id', equipmentId);
  if (error) throw error;
}

// ── БРОНИРОВАНИЯ ──

export async function createRental(rental: Record<string, unknown>) {
  const { data, error } = await db()
    .from('rentals')
    .insert(rental)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRentalById(rentalId: string) {
  const { data, error } = await db()
    .from('rentals')
    .select('*')
    .eq('rental_id', rentalId)
    .single();
  if (error) return null;
  return data;
}

export async function updateRental(rentalId: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('rentals')
    .update(updates)
    .eq('rental_id', rentalId);
  if (error) throw error;
}

// ── ПЛАТЕЖИ ──

export async function createPaymentRecord(payment: Record<string, unknown>) {
  const { error } = await db()
    .from('payments')
    .insert(payment);
  if (error) throw error;
}
