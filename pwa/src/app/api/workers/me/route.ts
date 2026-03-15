import { NextResponse } from 'next/server';
import { getTelegramIdFromSession } from '@/lib/auth';
import {
  getWorkerByTelegramId,
  getWorkerStats,
} from '@/lib/sheets';

export async function GET() {
  const telegramId = await getTelegramIdFromSession();
  if (!telegramId) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }

  const worker = await getWorkerByTelegramId(telegramId);
  if (!worker) {
    return NextResponse.json(
      { error: 'Исполнитель не найден. Зарегистрируйтесь через бота.' },
      { status: 404 }
    );
  }

  const stats = await getWorkerStats(telegramId);

  return NextResponse.json({
    worker: {
      telegram_id: worker.telegram_id,
      username: worker.username,
      name: worker.name,
      phone: worker.phone,
      rating: worker.rating,
      jobs_count: worker.jobs_count,
      is_vip: worker.is_vip === 'TRUE',
      vip_expires_at: worker.vip_expires_at,
      skills: worker.skills,
      balance: worker.balance,
      ban_until: worker.ban_until,
      is_selfemployed: worker.is_selfemployed === 'TRUE',
    },
    stats: {
      total_earned: stats.total_earned,
      pending_payout: stats.pending_payout,
      paid_orders: stats.paid_orders,
    },
  });
}
