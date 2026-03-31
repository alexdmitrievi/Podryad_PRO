import { NextRequest, NextResponse } from 'next/server';
import { getListingById, logContactRequest } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: { listing_id?: string; name?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const { listing_id } = body;
    if (!listing_id) {
      return NextResponse.json({ error: 'missing_listing_id' }, { status: 400 });
    }

    const listing = await getListingById(listing_id);
    if (!listing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const phone = session.user_id.replace('reg:', '');
    await logContactRequest(listing_id, phone, body.name);

    // Return supplier contact info
    const supplier = listing.supplier as Record<string, unknown> | null;
    return NextResponse.json({
      ok: true,
      contact: {
        company_name: supplier?.company_name,
        contact_name: supplier?.contact_name,
        phone: supplier?.user_phone,
      },
    });
  } catch (e) {
    console.error('POST /api/marketplace/contact:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
