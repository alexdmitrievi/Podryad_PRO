import { NextResponse } from 'next/server';
import { getListingsBySupplier, getSupplierByPhone, getSupplierStats } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'supplier') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const phone = session.user_id.replace('reg:', '');
    const supplier = await getSupplierByPhone(phone);
    if (!supplier) {
      return NextResponse.json({ error: 'supplier_not_found' }, { status: 404 });
    }

    const [listings, stats] = await Promise.all([
      getListingsBySupplier(supplier.id),
      getSupplierStats(supplier.id),
    ]);

    return NextResponse.json({ supplier, listings, stats });
  } catch (e) {
    console.error('GET /api/marketplace/my:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
