import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';
import { getEquipmentById, createRental, updateEquipmentStatus } from '@/lib/db';
import { createPayment } from '@/lib/yukassa';

const DURATION_MAP: Record<string, { label: string; hours: number; rateField: 'rate_4h' | 'rate_day' | 'rate_3days' }> = {
  '4h':    { label: '4 часа',  hours: 4,   rateField: 'rate_4h' },
  'day':   { label: '1 день',  hours: 24,  rateField: 'rate_day' },
  '3days': { label: '3 дня',   hours: 72,  rateField: 'rate_3days' },
};

export async function POST(req: Request) {
  try {
    const viewer = await getViewerSession();
    if (!viewer) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    let body: { equipment_id?: string; duration?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    const equipmentId = body.equipment_id?.trim();
    const durationKey = body.duration?.trim();

    if (!equipmentId) {
      return NextResponse.json({ error: 'Укажите equipment_id' }, { status: 400 });
    }
    if (!durationKey || !DURATION_MAP[durationKey]) {
      return NextResponse.json({ error: 'Укажите duration: 4h, day или 3days' }, { status: 400 });
    }

    const equipment = await getEquipmentById(equipmentId);
    if (!equipment) {
      return NextResponse.json({ error: 'Оборудование не найдено' }, { status: 404 });
    }

    if (equipment.status !== 'available') {
      return NextResponse.json({ error: 'Оборудование недоступно' }, { status: 409 });
    }

    const dur = DURATION_MAP[durationKey];
    const price = Number(equipment[dur.rateField]) || 0;
    const deposit = Number(equipment.deposit) || 0;
    const totalAmount = price + deposit;

    // Создаём бронирование
    const rental = await createRental({
      equipment_id: equipmentId,
      equipment_name: String(equipment.name),
      renter_id: viewer.user_id,
      renter_name: '',
      duration: durationKey,
      duration_hours: dur.hours,
      price,
      deposit,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Обновляем статус оборудования
    await updateEquipmentStatus(equipmentId, 'rented');

    // Создаём платёж YooKassa
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podryad.pro';
    const payment = await createPayment({
      amount: totalAmount,
      description: `Аренда: ${equipment.name} (${dur.label}) + залог`,
      returnUrl: `${siteUrl}/equipment`,
      metadata: {
        type: 'rental',
        rental_id: String(rental.rental_id),
        equipment_id: equipmentId,
      },
      idempotenceKey: `rental-${rental.rental_id}`,
    });

    return NextResponse.json({
      success: true,
      rental_id: rental.rental_id,
      payment_url: payment.confirmationUrl,
      price,
      deposit,
      total: totalAmount,
    });
  } catch (error) {
    console.error('POST /api/equipment/book error:', error);
    return NextResponse.json({ error: 'Ошибка бронирования' }, { status: 500 });
  }
}
