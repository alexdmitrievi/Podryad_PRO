import { NextResponse } from 'next/server';
import { getSessionFromCookies, getCustomerProfile } from '@/lib/customerAuth';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ customer: null });
  }
  const profile = await getCustomerProfile(session.sub);
  if (!profile) {
    return NextResponse.json({ customer: null });
  }
  return NextResponse.json({ customer: profile });
}
