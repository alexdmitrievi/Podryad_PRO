import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/customerAuth';
import { getServiceClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ customer: null });
  }

  const db = getServiceClient();

  // Try customers table first
  const { data: customer } = await db
    .from('customers')
    .select('id, phone, name, customer_type, org_name, inn, city, preferred_contact, created_at')
    .eq('phone', session.phone)
    .maybeSingle();

  if (customer) {
    return NextResponse.json({ customer });
  }

  // Try workers table (executor)
  const { data: worker } = await db
    .from('workers')
    .select('telegram_id, name, phone, city, rating, jobs_count')
    .eq('user_phone', session.phone)
    .maybeSingle();

  if (worker) {
    return NextResponse.json({
      customer: {
        id: session.sub,
        phone: session.phone,
        name: worker.name,
        customer_type: 'personal',
        org_name: null,
        inn: null,
        city: worker.city,
        preferred_contact: null,
        created_at: '',
        telegram_id: worker.telegram_id,
        rating: worker.rating,
        jobs_count: worker.jobs_count,
      },
    });
  }

  // User exists in users table but no profile yet
  const { data: user } = await db
    .from('users')
    .select('phone, name, role')
    .eq('phone', session.phone)
    .maybeSingle();

  return NextResponse.json({
    customer: user ? {
      id: session.sub,
      phone: session.phone,
      name: user.name,
      customer_type: 'personal',
      org_name: null,
      inn: null,
      city: '',
      preferred_contact: null,
      created_at: '',
    } : null,
  });
}
