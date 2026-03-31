import { NextRequest, NextResponse } from 'next/server';
import { getListingById, updateListing, deactivateListing, getSupplierByPhone } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await getListingById(id);
    if (!listing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(listing);
  } catch (e) {
    console.error('GET /api/marketplace/listings/[id]:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'supplier') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const phone = session.user_id.replace('reg:', '');
    const supplier = await getSupplierByPhone(phone);
    if (!supplier) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const listing = await getListingById(id);
    if (!listing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (listing.supplier_id !== supplier.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const allowed = ['title', 'description', 'specs', 'price', 'price_unit',
                     'min_order', 'delivery_included', 'delivery_price', 'delivery_note',
                     'city', 'is_active'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (updates.price) updates.price = Number(updates.price);

    await updateListing(id, updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/marketplace/listings/[id]:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'supplier') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const phone = session.user_id.replace('reg:', '');
    const supplier = await getSupplierByPhone(phone);
    if (!supplier) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const listing = await getListingById(id);
    if (!listing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (listing.supplier_id !== supplier.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await deactivateListing(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/marketplace/listings/[id]:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
