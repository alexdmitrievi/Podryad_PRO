import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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
      .select('order_id, status, payment_status, executor_payout_status, customer_total, platform_margin, display_price, contractor_id, created_at')
      .order('created_at', { ascending: false }),
    // Contractors
    db.from('contractors')
      .select('id, status, city, specialties, created_at'),
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
  const completedOrders = allOrders.filter(o => o.status === 'completed' || o.status === 'done');

  // === Order Status Distribution ===
  const statusCounts: Record<string, number> = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  // === Payment Status Distribution ===
  const paymentCounts: Record<string, number> = {};
  orders.forEach(o => {
    const ps = o.payment_status || 'pending';
    paymentCounts[ps] = (paymentCounts[ps] || 0) + 1;
  });

  // === Orders by Work Type ===
  const byWorkType: Record<string, number> = {};
  orders.forEach(o => {
    const wt = o.work_type || 'other';
    byWorkType[wt] = (byWorkType[wt] || 0) + 1;
  });

  // === Daily Orders (for chart) ===
  const dailyOrders: Record<string, number> = {};
  const dailyRevenue: Record<string, number> = {};
  orders.forEach(o => {
    const day = o.created_at?.slice(0, 10) || 'unknown';
    dailyOrders[day] = (dailyOrders[day] || 0) + 1;
    dailyRevenue[day] = (dailyRevenue[day] || 0) + (Number(o.platform_margin) || 0);
  });

  // === Leads by Source ===
  const leadsBySource: Record<string, number> = {};
  leads.forEach(l => {
    leadsBySource[l.source] = (leadsBySource[l.source] || 0) + 1;
  });

  // === Conversion Funnel ===
  const uniqueLeadPhones = new Set(leads.map(l => l.id));
  const leadsToOrders = orders.filter(o => o.customer_phone).length;

  // === Top Contractors (by assigned orders) ===
  const contractorOrders: Record<string, number> = {};
  allOrders.forEach(o => {
    if (o.contractor_id) {
      contractorOrders[o.contractor_id] = (contractorOrders[o.contractor_id] || 0) + 1;
    }
  });

  // === Top Customers (by orders count) ===
  const customerOrders: Record<string, number> = {};
  allOrders.forEach(o => {
    const phone = (o as Record<string, unknown>).customer_phone as string;
    if (phone) {
      customerOrders[phone] = (customerOrders[phone] || 0) + 1;
    }
  });
  // For top customers we need to match with customer data
  const topCustomerPhones = Object.entries(customerOrders)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // === Contractor Status Distribution ===
  const contractorStatuses: Record<string, number> = {};
  contractors.forEach(c => {
    contractorStatuses[c.status] = (contractorStatuses[c.status] || 0) + 1;
  });

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
      statusCounts,
      paymentCounts,
      byWorkType,
      dailyOrders,
      dailyRevenue,
      leadsBySource,
      contractorStatuses,
    },
    topCustomers: topCustomerPhones.map(([phone, count]) => ({ phone, ordersCount: count })),
    topContractors: Object.entries(contractorOrders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, ordersCount: count })),
  });
}
