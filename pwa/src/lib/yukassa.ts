const SHOP_ID = process.env.YUKASSA_SHOP_ID!;
const SECRET_KEY = process.env.YUKASSA_SECRET_KEY!;

export interface CreatePaymentParams {
  amount: number; // в рублях
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  idempotenceKey: string;
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
