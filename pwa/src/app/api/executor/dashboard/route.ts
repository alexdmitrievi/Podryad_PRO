import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/customerAuth';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== 'worker') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getServiceClient();
    const phone = session.phone;

    // Get worker profile
    const { data: worker } = await db
      .from('workers')
      .select('*')
      .eq('user_phone', phone)
      .maybeSingle();

    // Get executor responses
    const { data: responses } = await db
      .from('executor_responses')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get orders where this executor is assigned
    const { data: assignedOrders } = await db
      .from('orders')
      .select('order_id, order_number, work_type, address, status, payment_status, executor_payout_status, executor_payout_at, customer_total, supplier_payout, display_price, created_at')
      .eq('executor_id', worker?.telegram_id || `pwa:${phone}`)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get orders this executor responded to
    const responseOrderIds = (responses || []).map(r => r.order_id).filter(Boolean);
    let respondedOrders: Array<Record<string, unknown>> = [];
    if (responseOrderIds.length > 0) {
      const { data: ros } = await db
        .from('orders')
        .select('order_id, order_number, work_type, address, status, created_at')
        .in('order_id', responseOrderIds)
        .order('created_at', { ascending: false });
      respondedOrders = ros || [];
    }

    return NextResponse.json({
      ok: true,
      profile: worker ? {
        phone: worker.phone,
        name: worker.name,
        telegram_id: worker.telegram_id,
        city: worker.city,
        rating: worker.rating,
        jobs_count: worker.jobs_count,
        is_vip: worker.is_vip,
      } : {
        phone,
        name: session.name,
        city: '',
        rating: null,
        jobs_count: 0,
      },
      responses: (responses || []).map(r => ({
        id: r.id,
        order_id: r.order_id,
        comment: r.comment,
        price: r.price,
        status: r.status,
        created_at: r.created_at,
        order: respondedOrders.find(o => o.order_id === r.order_id) || null,
      })),
      assignedOrders: (assignedOrders || []).map(o => ({
        order_id: o.order_id,
        order_number: o.order_number,
        work_type: o.work_type,
        address: o.address,
        status: o.status,
        payment_status: o.payment_status,
        executor_payout_status: o.executor_payout_status,
        executor_payout_at: o.executor_payout_at,
        customer_total: o.customer_total,
        supplier_payout: o.supplier_payout,
        display_price: o.display_price,
        created_at: o.created_at,
      })),
    });
  } catch (err) {
    log.error('Executor dashboard error', { error: String(err) });
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
