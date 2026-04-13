import type { Order } from './types';
import { getServiceClient } from './supabase';

const db = () => getServiceClient();

/** Приводит строку из Supabase к типу Order (order_id в БД — TEXT). */
export function orderFromDb(row: Record<string, unknown>): Order {
  const oid = row.order_id;
  const orderIdStr = oid != null && String(oid).trim() !== '' ? String(oid) : '';
  return {
    order_id: orderIdStr,
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
    customer_confirmed: row.customer_confirmed != null ? Boolean(row.customer_confirmed) : undefined,
    customer_confirmed_at: row.customer_confirmed_at != null ? String(row.customer_confirmed_at) : undefined,
    supplier_confirmed: row.supplier_confirmed != null ? Boolean(row.supplier_confirmed) : undefined,
    supplier_confirmed_at: row.supplier_confirmed_at != null ? String(row.supplier_confirmed_at) : undefined,
    payout_method: row.payout_method != null ? String(row.payout_method) : undefined,
    customer_phone: row.customer_phone != null ? String(row.customer_phone) : undefined,
    // Markup model fields
    customer_total: row.customer_total != null ? Number(row.customer_total) : undefined,
    supplier_payout: row.supplier_payout != null ? Number(row.supplier_payout) : undefined,
    platform_margin: row.platform_margin != null ? Number(row.platform_margin) : undefined,
    order_number: row.order_number != null ? String(row.order_number) : undefined,
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

export async function findUserByEmail(email: string) {
  const { data, error } = await db()
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error) return null;
  return data;
}

export async function createUser(user: {
  phone?: string;
  email?: string;
  name: string;
  password_hash: string;
  role: string;
  entity_type?: string;
  company_name?: string;
  inn?: string;
}) {
  const { data, error } = await db()
    .from('users')
    .insert({
      ...user,
      email: user.email?.toLowerCase(),
    })
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

/** Создать профиль воркера (при PWA-регистрации). white_list=false по умолчанию. */
export async function createWorkerProfile(data: {
  telegram_id: string;
  name: string;
  phone: string;
  user_phone: string;
}) {
  const { error } = await db()
    .from('workers')
    .insert({
      telegram_id: data.telegram_id,
      name: data.name,
      phone: data.phone,
      user_phone: data.user_phone,
      white_list: false,
      rating: 5.0,
      jobs_count: 0,
    });
  if (error) throw error;
}

export async function updateWorker(phone: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('workers')
    .update(updates)
    .eq('phone', phone);
  if (error) throw error;
}

/** Найти профиль воркера по user_id (ищет и по telegram_id, и по user_phone). */
export async function getWorkerByUserId(userId: string): Promise<Record<string, unknown> | null> {
  // Сначала ищем по telegram_id (Telegram-авторизация)
  const { data: byTg } = await db()
    .from('workers')
    .select('*')
    .eq('telegram_id', userId)
    .single();
  if (byTg) return byTg as Record<string, unknown>;

  // Потом по user_phone (PWA-регистрация: userId = 'reg:<phone>')
  const phoneMatch = userId.match(/^reg:(\d+)$/);
  if (phoneMatch) {
    const { data: byPhone } = await db()
      .from('workers')
      .select('*')
      .eq('phone', phoneMatch[1])
      .single();
    if (byPhone) return byPhone as Record<string, unknown>;

    const { data: byUserPhone } = await db()
      .from('workers')
      .select('*')
      .eq('user_phone', phoneMatch[1])
      .single();
    if (byUserPhone) return byUserPhone as Record<string, unknown>;
  }

  return null;
}

/** Валидация воркера: whitelist, рейтинг, бан. Возвращает null если OK, иначе строку ошибки. */
export function validateWorkerAccess(worker: Record<string, unknown>): string | null {
  if (!worker.white_list) return 'Вы не в белом списке. Обратитесь к администратору.';
  if (worker.ban_until && new Date(String(worker.ban_until)) > new Date()) {
    return `Вы заблокированы до ${new Date(String(worker.ban_until)).toLocaleDateString('ru-RU')}`;
  }
  const rating = Number(worker.rating) || 0;
  if (worker.jobs_count != null && Number(worker.jobs_count) >= 5 && rating < 4.0) {
    return `Ваш рейтинг (${rating.toFixed(1)}) ниже минимального (4.0)`;
  }
  return null;
}

/**
 * Атомарный захват заказа: обновляет только если status='published'.
 * Возвращает количество обновлённых строк (0 = кто-то уже забрал).
 */
export async function atomicClaimOrder(orderId: string, executorId: string): Promise<number> {
  const { data, error } = await db()
    .from('orders')
    .update({ status: 'closed', executor_id: executorId })
    .eq('order_id', orderId)
    .eq('status', 'published')
    .select('order_id');
  if (error) throw error;
  return data?.length ?? 0;
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

// ── ЗАЯВКИ НА МАТЕРИАЛЫ ──

export async function createMaterialRequest(phone: string) {
  const { error } = await db()
    .from('material_requests')
    .insert({ phone });
  if (error) throw error;
}

// ── МАРКЕТПЛЕЙС ──

export async function getMarketplaceCategories() {
  const { data, error } = await db()
    .from('marketplace_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getListings(filters?: {
  category?: string;
  city?: string;
  type?: 'material' | 'heavy_equipment';
}) {
  let query = db()
    .from('listings')
    .select(`
      *,
      supplier:suppliers(company_name, city, delivery_available, is_verified),
      category:marketplace_categories(name, type, unit, icon)
    `)
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (filters?.category) query = query.eq('category_slug', filters.category);
  if (filters?.city && filters.city !== 'all') query = query.eq('city', filters.city);
  if (filters?.type) {
    query = query.eq('category.type' as never, filters.type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getListingById(listingId: string) {
  const { data, error } = await db()
    .from('listings')
    .select(`
      *,
      supplier:suppliers(company_name, city, delivery_available, is_verified, contact_name, user_phone),
      category:marketplace_categories(name, type, unit, icon)
    `)
    .eq('listing_id', listingId)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data;
}

export async function getListingsBySupplier(supplierId: string) {
  const { data, error } = await db()
    .from('listings')
    .select(`
      *,
      category:marketplace_categories(name, type, unit, icon)
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createListing(data: Record<string, unknown>) {
  const { data: row, error } = await db()
    .from('listings')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function updateListing(listingId: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('listing_id', listingId);
  if (error) throw error;
}

export async function deactivateListing(listingId: string) {
  const { error } = await db()
    .from('listings')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('listing_id', listingId);
  if (error) throw error;
}

export async function getSupplierById(supplierId: string) {
  const { data, error } = await db()
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data;
}

export async function getPublicListingsBySupplier(supplierId: string) {
  const { data, error } = await db()
    .from('listings')
    .select('listing_id, title, description, display_price, price_unit, city, listing_type, category_slug, images, rating, orders_count, is_active, is_priority')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .order('is_priority', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSupplierByPhone(phone: string) {
  const { data, error } = await db()
    .from('suppliers')
    .select('*')
    .eq('user_phone', phone)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data;
}

export async function createSupplier(data: {
  user_phone: string;
  company_name: string;
  contact_name: string;
  description?: string;
  city?: string;
  delivery_available?: boolean;
}) {
  const { data: row, error } = await db()
    .from('suppliers')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function logContactRequest(listingId: string, phone: string, name?: string) {
  const { data: listing } = await db()
    .from('listings')
    .select('id')
    .eq('listing_id', listingId)
    .single();
  if (!listing) return;

  await db().from('contact_requests').insert({
    listing_id: listing.id,
    requester_phone: phone,
    requester_name: name || null,
  });

  await db().rpc('increment_listing_contacts', { p_listing_id: listingId });
}

export async function getBestPriceByCategory(slug: string, city?: string) {
  let query = db()
    .from('listings')
    .select('price, city, supplier:suppliers(company_name)')
    .eq('category_slug', slug)
    .eq('is_active', true)
    .order('price', { ascending: true })
    .limit(1);

  if (city && city !== 'all') query = query.eq('city', city);

  const { data, error } = await query;
  if (error) return null;
  return data?.[0] ?? null;
}

export async function getSupplierStats(supplierId: string) {
  const { data, error } = await db()
    .from('listings')
    .select('views_count, contacts_count, is_active')
    .eq('supplier_id', supplierId);
  if (error) return { total: 0, active: 0, views: 0, contacts: 0 };

  const rows = data || [];
  return {
    total: rows.length,
    active: rows.filter((r: Record<string, unknown>) => r.is_active).length,
    views: rows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.views_count) || 0), 0),
    contacts: rows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.contacts_count) || 0), 0),
  };
}

// ── СПОРЫ (disputes) ──────────────────────────────────────────

export async function createDispute(dispute: {
  order_id: string;
  initiated_by: string;
  reason: string;
  description?: string;
}) {
  const { data, error } = await db()
    .from('disputes')
    .insert({ ...dispute, resolution: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDisputesByOrder(orderId: string) {
  const { data, error } = await db()
    .from('disputes')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function updateDispute(
  disputeId: string,
  updates: { resolution?: string; resolved_at?: string }
) {
  const { error } = await db()
    .from('disputes')
    .update(updates)
    .eq('id', disputeId);
  if (error) throw error;
}

// ── ИСПОЛНИТЕЛИ (contractors) ──────────────────────────────────

export async function createContractor(contractor: {
  name: string;
  phone: string;
  city?: string;
  specialties: string[];
  experience?: string;
  preferred_contact?: string;
  about?: string;
  source?: string;
  telegram_id?: string;
  max_id?: string;
  email?: string;
  is_brigade?: boolean;
  crew_size?: number;
  has_transport?: boolean;
  has_tools?: boolean;
  payout_type?: string;
  payout_sbp_phone?: string;
  payout_bank_details?: string;
  is_legal_entity?: boolean;
  inn?: string;
}) {
  const { data, error } = await db()
    .from('contractors')
    .insert({
      name: contractor.name,
      phone: contractor.phone,
      city: contractor.city ?? 'omsk',
      specialties: contractor.specialties,
      experience: contractor.experience ?? null,
      preferred_contact: contractor.preferred_contact ?? 'phone',
      about: contractor.about ?? null,
      source: contractor.source ?? 'pwa',
      telegram_id: contractor.telegram_id ?? null,
      max_id: contractor.max_id ?? null,
      email: contractor.email ?? null,
      is_brigade: contractor.is_brigade ?? false,
      crew_size: contractor.crew_size ?? null,
      has_transport: contractor.has_transport ?? null,
      has_tools: contractor.has_tools ?? null,
      payout_type: contractor.payout_type ?? null,
      payout_sbp_phone: contractor.payout_sbp_phone ?? null,
      payout_bank_details: contractor.payout_bank_details ?? null,
      is_legal_entity: contractor.is_legal_entity ?? false,
      inn: contractor.inn ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getContractors() {
  const { data, error } = await db()
    .from('contractors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getContractorById(id: string) {
  const { data, error } = await db()
    .from('contractors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function updateContractor(id: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('contractors')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ── CUSTOMER TOKENS ────────────────────────────────────────────

export async function getOrCreateCustomerToken(phone: string, preferredContact?: string) {
  const { data: existing } = await db()
    .from('customer_tokens')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existing) return existing;

  const { data, error } = await db()
    .from('customer_tokens')
    .insert({
      phone,
      preferred_contact: preferredContact ?? 'phone',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCustomerByToken(token: string) {
  const { data, error } = await db()
    .from('customer_tokens')
    .select('*')
    .eq('access_token', token)
    .single();
  if (error) return null;
  return data;
}

export async function getOrdersByCustomerPhone(phone: string) {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
