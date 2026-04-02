import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { findUserByPhone } from '@/lib/db';

interface RegisterRequest {
  workerType: 'individual' | 'crew';
  name: string;
  phone: string;
  crewSize?: number;
  specializations?: string[];
  city: string;
  inn?: string;
}

export async function POST(req: Request) {
  try {
    let body: RegisterRequest;
    try {
      body = (await req.json()) as RegisterRequest;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }
    if (!body.city?.trim()) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 });
    }
    if (body.workerType !== 'individual' && body.workerType !== 'crew') {
      return NextResponse.json({ error: 'workerType must be individual or crew' }, { status: 400 });
    }

    const db = getServiceClient();

    // Check if supplier profile already exists for this phone
    const { data: existing } = await db
      .from('suppliers')
      .select('id')
      .eq('user_phone', body.phone)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Supplier profile already exists for this phone', id: existing.id },
        { status: 409 }
      );
    }

    // Find or note that user account doesn't exist yet (OK — supplier can register without PWA account)
    const user = await findUserByPhone(body.phone);

    const companyName =
      body.workerType === 'crew'
        ? body.name
        : body.name;

    const { data: supplier, error } = await db
      .from('suppliers')
      .insert({
        user_phone: body.phone,
        company_name: companyName,
        contact_name: body.name,
        name: body.name,
        city: body.city,
        worker_type: body.workerType,
        crew_size: body.workerType === 'crew' ? (body.crewSize ?? 2) : 1,
        description: body.specializations?.join(', ') ?? null,
        is_active: true,
        is_verified: false,
        delivery_available: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supplier insert error:', error);
      return NextResponse.json({ error: 'Failed to create supplier profile' }, { status: 500 });
    }

    return NextResponse.json({
      id: supplier.id,
      hasAccount: !!user,
      message: body.workerType === 'crew'
        ? 'Бригада зарегистрирована. Ожидайте модерации.'
        : 'Регистрация принята. Ожидайте модерации.',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers/register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
