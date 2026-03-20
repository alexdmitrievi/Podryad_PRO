import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';

export async function GET() {
  const viewer = await getViewerSession();
  if (!viewer) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    telegram_id: viewer.user_id,
    role: viewer.role,
  });
}
