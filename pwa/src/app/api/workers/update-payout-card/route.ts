import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

interface UpdatePayoutCardRequest {
  card_synonym: string;   // YooKassa card synonym from Payout Widget
  card_last4: string;     // last 4 digits for display (e.g. "4242")
}

export async function POST(req: Request) {
  try {
    // Authenticate: require valid session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorise: only workers can save payout cards
    if (session.role !== 'worker') {
      return NextResponse.json(
        { error: 'Forbidden: only workers can update payout card' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body: UpdatePayoutCardRequest;
    try {
      body = (await req.json()) as UpdatePayoutCardRequest;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.card_synonym || typeof body.card_synonym !== 'string' || body.card_synonym.trim() === '') {
      return NextResponse.json(
        { error: 'card_synonym is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (
      !body.card_last4 ||
      typeof body.card_last4 !== 'string' ||
      !/^\d{4}$/.test(body.card_last4)
    ) {
      return NextResponse.json(
        { error: 'card_last4 is required and must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Update workers table: session.user_id is the worker's phone number
    const supabase = getServiceClient();
    const { error: dbError } = await supabase
      .from('workers')
      .update({
        payout_card: body.card_last4,
        payout_card_synonym: body.card_synonym,
      })
      .eq('phone', session.user_id);

    if (dbError) {
      console.error('POST /api/workers/update-payout-card DB error:', dbError);
      return NextResponse.json({ error: 'Failed to update payout card' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/workers/update-payout-card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
