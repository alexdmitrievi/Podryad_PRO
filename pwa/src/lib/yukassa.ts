const SHOP_ID = process.env.YUKASSA_SHOP_ID!;
const SECRET_KEY = process.env.YUKASSA_SECRET_KEY!;

// ── ESCROW TYPES ──

export interface CreateEscrowPaymentParams {
  customerTotal: number;  // amount customer pays (with markup, minus combo discount)
  orderNumber: string;    // human-readable order number for receipt
  description: string;
  returnUrl: string;
  orderId: string;
  customerPhone: string;  // for receipt SMS
  idempotenceKey: string;
}

export interface CreatePayoutParams {
  amount: number;
  cardSynonym: string;   // from YooKassa Payout Widget
  orderId: string;
  workerPhone: string;
  description: string;
  idempotenceKey: string;
}

export type PaymentMethodType = 'bank_card' | 'sbp' | 'b2b_sberbank';

export interface CreatePaymentParams {
  amount: number; // в рублях
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  idempotenceKey: string;
  /** Способ оплаты. Если не указан — YooKassa предложит выбор на своей странице */
  paymentMethodType?: PaymentMethodType;
  /** Данные для b2b_sberbank: ИНН и наименование плательщика */
  payerBankDetails?: {
    fullName: string;
    inn: string;
  };
}

export interface PaymentResult {
  id: string;
  confirmationUrl: string;
  status: string;
}

export async function createPayment(
  params: CreatePaymentParams
): Promise<PaymentResult> {
  const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Idempotence-Key': params.idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { value: `${params.amount}.00`, currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      capture: true,
      description: params.description,
      metadata: params.metadata,
      ...(params.paymentMethodType && {
        payment_method_data: {
          type: params.paymentMethodType,
          ...(params.paymentMethodType === 'b2b_sberbank' && params.payerBankDetails && {
            payment_purpose: params.description,
            vat_data: { type: 'untaxed' },
            payer_bank_details: {
              full_name: params.payerBankDetails.fullName,
              inn: params.payerBankDetails.inn,
            },
          }),
        },
      }),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  };
  return {
    id: data.id,
    confirmationUrl: data.confirmation?.confirmation_url || '',
    status: data.status,
  };
}

// ── ESCROW FUNCTIONS ──

/**
 * Creates a 2-stage YooKassa payment with capture:false (hold funds).
 * Includes 2-line fiscal receipt per 54-FZ for УСН Доходы 6%.
 * Returns the same PaymentResult shape as createPayment().
 */
export async function createEscrowPayment(
  params: CreateEscrowPaymentParams
): Promise<PaymentResult> {
  const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Idempotence-Key': params.idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { value: params.customerTotal.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      capture: false,
      description: params.description,
      metadata: { order_id: params.orderId, type: 'escrow' },
      receipt: {
        tax_system_code: 2, // УСН Доходы
        customer: { phone: params.customerPhone },
        items: [
          {
            description: `Услуги по заказу ${params.orderNumber} — Подряд PRO`,
            quantity: '1.00',
            amount: { value: params.customerTotal.toFixed(2), currency: 'RUB' },
            vat_code: 1, // Без НДС
            payment_subject: 'service',
            payment_mode: 'full_prepayment',
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa createEscrowPayment error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  };
  return {
    id: data.id,
    confirmationUrl: data.confirmation?.confirmation_url || '',
    status: data.status,
  };
}

/**
 * Captures the full held amount of a 2-stage payment.
 * Calls POST /payments/{paymentId}/capture with an empty body.
 */
export async function capturePayment(
  paymentId: string,
  idempotenceKey: string
): Promise<void> {
  const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

  const res = await fetch(
    `https://api.yookassa.ru/v3/payments/${paymentId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa capturePayment error: ${res.status} ${err}`);
  }
}

/**
 * Cancels a held 2-stage payment and releases the funds back to the payer.
 * Calls POST /payments/{paymentId}/cancel with an empty body.
 */
export async function cancelPayment(
  paymentId: string,
  idempotenceKey: string
): Promise<void> {
  const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

  const res = await fetch(
    `https://api.yookassa.ru/v3/payments/${paymentId}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa cancelPayment error: ${res.status} ${err}`);
  }
}

/**
 * Creates a full refund for a captured payment.
 * Calls POST /refunds with the payment_id and original amount.
 */
export async function createRefund(
  paymentId: string,
  amount: number,
  idempotenceKey: string
): Promise<void> {
  const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

  const res = await fetch('https://api.yookassa.ru/v3/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Idempotence-Key': idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_id: paymentId,
      amount: { value: amount.toFixed(2), currency: 'RUB' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa createRefund error: ${res.status} ${err}`);
  }
}

/**
 * Creates a payout to an executor's bank card via the YooKassa Payouts API.
 * Uses SEPARATE credentials (YUKASSA_PAYOUT_AGENT_ID + YUKASSA_PAYOUT_SECRET).
 * cardSynonym must be obtained from the YooKassa Payout Widget (PCI DSS compliant).
 */
export async function createPayout(
  params: CreatePayoutParams
): Promise<{ id: string; status: string }> {
  // Read payout credentials at call time (not module load time) to allow
  // graceful degradation when the payouts agent contract is not yet signed.
  const agentId = process.env.YUKASSA_PAYOUT_AGENT_ID;
  const payoutSecret = process.env.YUKASSA_PAYOUT_SECRET;

  if (!agentId || !payoutSecret) {
    throw new Error(
      'YUKASSA_PAYOUT_AGENT_ID and YUKASSA_PAYOUT_SECRET are required for payouts'
    );
  }

  const auth = Buffer.from(`${agentId}:${payoutSecret}`).toString('base64');

  const res = await fetch('https://payouts.yookassa.ru/v3/payouts', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Idempotence-Key': params.idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { value: params.amount.toFixed(2), currency: 'RUB' },
      payout_destination: {
        type: 'bank_card',
        card: {
          // card.number accepts both raw card numbers AND card synonyms.
          // We use a synonym from YooKassa Payout Widget — PCI DSS compliant.
          number: params.cardSynonym,
        },
      },
      description: params.description,
      metadata: { order_id: params.orderId },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa createPayout error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { id: string; status: string };
  return { id: data.id, status: data.status };
}
