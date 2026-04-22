import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(adminPin);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') || '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '30'; // days
  const days = Math.min(Math.max(parseInt(period, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Parallel queries for all analytics data
  const [
    ordersRes,
    allOrdersRes,
    contractorsRes,
    customersRes,
    leadsRes,
    responsesRes,
    disputesRes,
  ] = await Promise.all([
    // Orders in period
    db.from('orders')
      .select('order_id, status, payment_status, executor_payout_status, customer_total, supplier_payout, platform_margin, display_price, work_type, subcategory, customer_phone, contractor_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    // All orders (for totals)
    db.from('orders')
      .select('order_id, status, payment_status, executor_payout_status, customer_total, supplier_payout, platform_margin, display_price, contractor_id, customer_name, customer_phone, created_at')
      .order('created_at', { ascending: false }),
    // Contractors
    db.from('contractors')
      .select('id, name, status, city, specialties, created_at'),
    // Customers
    db.from('customers')
      .select('id, customer_type, city, created_at'),
    // Leads in period
    db.from('leads')
      .select('id, work_type, city, source, created_at')
      .gte('created_at', since),
    // Executor responses in period
    db.from('executor_responses')
      .select('id, order_id, status, created_at')
      .gte('created_at', since),
    // Disputes
    db.from('disputes')
      .select('id, resolution, created_at'),
  ]);

  const orders = ordersRes.data || [];
  const allOrders = allOrdersRes.data || [];
  const contractors = contractorsRes.data || [];
  const customers = customersRes.data || [];
  const leads = leadsRes.data || [];
  const responses = responsesRes.data || [];
  const disputes = disputesRes.data || [];

  // === KPI Summary ===
  const totalRevenue = allOrders.reduce((s, o) => s + (Number(o.platform_margin) || 0), 0);
  const periodRevenue = orders.reduce((s, o) => s + (Number(o.platform_margin) || 0), 0);
  const periodGMV = orders.reduce((s, o) => s + (Number(o.customer_total) || Number(o.display_price) || 0), 0);

  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const completedOrders = allOrders.filter(o => o.status === 'completed');

  // === Order Status Distribution ===
  const statusCountsMap: Record<string, number> = {};
  orders.forEach(o => { statusCountsMap[o.status] = (statusCountsMap[o.status] || 0) + 1; });

  // === Payment Status Distribution ===
  const paymentCountsMap: Record<string, number> = {};
  orders.forEach(o => {
    const ps = o.payment_status || 'pending';
    paymentCountsMap[ps] = (paymentCountsMap[ps] || 0) + 1;
  });

  // === Orders by Work Type (with revenue) ===
  const byWorkTypeMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach(o => {
    const wt = o.work_type || 'other';
    if (!byWorkTypeMap[wt]) byWorkTypeMap[wt] = { count: 0, revenue: 0 };
    byWorkTypeMap[wt].count += 1;
    byWorkTypeMap[wt].revenue += Number(o.platform_margin) || 0;
  });

  // === Daily Orders (for chart) ===
  const dailyOrdersMap: Record<string, number> = {};
  const dailyRevenueMap: Record<string, number> = {};
  orders.forEach(o => {
    const day = o.created_at?.slice(0, 10) || 'unknown';
    dailyOrdersMap[day] = (dailyOrdersMap[day] || 0) + 1;
    dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + (Number(o.platform_margin) || 0);
  });

  // === Leads by Source ===
  const leadsBySourceMap: Record<string, number> = {};
  leads.forEach(l => {
    leadsBySourceMap[l.source] = (leadsBySourceMap[l.source] || 0) + 1;
  });

  // === Conversion Funnel ===
  const leadsToOrders = orders.filter(o => o.customer_phone).length;

  // === Top Contractors (by assigned orders) ===
  const contractorOrdersMap: Record<string, { count: number; earned: number }> = {};
  allOrders.forEach(o => {
    if (o.contractor_id) {
      if (!contractorOrdersMap[o.contractor_id]) contractorOrdersMap[o.contractor_id] = { count: 0, earned: 0 };
      contractorOrdersMap[o.contractor_id].count += 1;
      contractorOrdersMap[o.contractor_id].earned += Number(o.supplier_payout) || 0;
    }
  });

  // === Top Customers (by orders count + spending) ===
  const customerOrdersMap: Record<string, { count: number; spent: number; name: string }> = {};
  allOrders.forEach(o => {
    const phone = o.customer_phone as string;
    if (phone) {
      if (!customerOrdersMap[phone]) customerOrdersMap[phone] = { count: 0, spent: 0, name: '' };
      customerOrdersMap[phone].count += 1;
      customerOrdersMap[phone].spent += Number(o.customer_total) || Number(o.display_price) || 0;
      const name = o.customer_name as string;
      if (name && !customerOrdersMap[phone].name) customerOrdersMap[phone].name = name;
    }
  });

  // === Contractor Status Distribution ===
  const contractorStatusesMap: Record<string, number> = {};
  contractors.forEach(c => {
    contractorStatusesMap[c.status] = (contractorStatusesMap[c.status] || 0) + 1;
  });

  // Build contractor name lookup
  const contractorNameMap: Record<string, string> = {};
  contractors.forEach(c => { contractorNameMap[c.id] = c.name || c.id; });

  // === Response rate ===
  const acceptedResponses = responses.filter(r => r.status === 'accepted').length;

  return NextResponse.json({
    ok: true,
    period: days,
    kpi: {
      totalRevenue,
      periodRevenue,
      periodGMV,
      totalOrders: allOrders.length,
      periodOrders: orders.length,
      paidOrdersCount: paidOrders.length,
      completedOrdersCount: completedOrders.length,
      avgOrderValue: orders.length > 0 ? Math.round(periodGMV / orders.length) : 0,
      avgMargin: paidOrders.length > 0 ? Math.round(periodRevenue / paidOrders.length) : 0,
      totalContractors: contractors.length,
      activeContractors: contractors.filter(c => c.status === 'active' || c.status === 'verified').length,
      totalCustomers: customers.length,
      businessCustomers: customers.filter(c => c.customer_type === 'business').length,
      totalLeads: leads.length,
      totalResponses: responses.length,
      acceptedResponses,
      responseRate: responses.length > 0 ? Math.round(acceptedResponses / responses.length * 100) : 0,
      totalDisputes: disputes.length,
      resolvedDisputes: disputes.filter(d => d.resolution && d.resolution !== 'pending').length,
    },
    charts: {
      statusCounts: Object.entries(statusCountsMap).map(([status, count]) => ({ status, count })),
      paymentCounts: Object.entries(paymentCountsMap).map(([payment_status, count]) => ({ payment_status, count })),
      byWorkType: Object.entries(byWorkTypeMap).map(([work_type, v]) => ({ work_type, count: v.count, revenue: v.revenue })),
      dailyOrders: Object.entries(dailyOrdersMap).sort().map(([date, count]) => ({ date, count })),
      dailyRevenue: Object.entries(dailyRevenueMap).sort().map(([date, revenue]) => ({ date, revenue })),
      leadsBySource: Object.entries(leadsBySourceMap).map(([source, count]) => ({ source, count })),
      contractorStatuses: Object.entries(contractorStatusesMap).map(([status, count]) => ({ status, count })),
    },
    topCustomers: Object.entries(customerOrdersMap)
      .sort((a, b) => b[1].spent - a[1].spent)
      .slice(0, 10)
      .map(([phone, v]) => ({ name: v.name || phone, phone, orders: v.count, total_spent: v.spent })),
    topContractors: Object.entries(contractorOrdersMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id, v]) => ({ name: contractorNameMap[id] || id, orders: v.count, total_earned: v.earned })),
  });
}
