import { NextResponse } from 'next/server';
import { getTelegramIdFromSession } from '@/lib/auth';

export async function GET() {
  const telegramId = await getTelegramIdFromSession();
  if (!telegramId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, telegram_id: telegramId });
}
