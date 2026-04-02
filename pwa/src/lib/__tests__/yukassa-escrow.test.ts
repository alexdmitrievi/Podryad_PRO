import { describe, it, expect, vi, beforeEach } from 'vitest';

// We use vi.mock to intercept fetch calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import {
  createEscrowPayment,
  capturePayment,
  cancelPayment,
  createPayout,
} from '@/lib/yukassa';

describe('createEscrowPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YUKASSA_SHOP_ID = 'test_shop';
    process.env.YUKASSA_SECRET_KEY = 'test_secret';
    process.env.YUKASSA_PAYOUT_AGENT_ID = 'test_agent';
    process.env.YUKASSA_PAYOUT_SECRET = 'test_payout_secret';

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'pay_123',
        status: 'pending',
        confirmation: { confirmation_url: 'https://yookassa.ru/pay' },
      }),
      text: async () => 'ok',
    });
  });

  it('Test 1: sends request body with capture:false', async () => {
    await createEscrowPayment({
      customerTotal: 1650,
      orderNumber: 'ПРО-0042',
      description: 'Заказ #42',
      returnUrl: 'https://example.com/return',
      orderId: '42',
      customerPhone: '79001234567',
      idempotenceKey: 'key-1',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.capture).toBe(false);
  });

  it('Test 2: receipt has exactly 1 item matching customerTotal', async () => {
    await createEscrowPayment({
      customerTotal: 1650,
      orderNumber: 'ПРО-0042',
      description: 'Заказ #42',
      returnUrl: 'https://example.com/return',
      orderId: '42',
      customerPhone: '79001234567',
      idempotenceKey: 'key-2',
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.receipt).toBeDefined();
    expect(body.receipt.items).toHaveLength(1);
    expect(parseFloat(body.receipt.items[0].amount.value)).toBeCloseTo(1650, 2);
  });

  it('Test 3: receipt uses tax_system_code:2 and vat_code:1', async () => {
    await createEscrowPayment({
      customerTotal: 1650,
      orderNumber: 'ПРО-0042',
      description: 'Заказ #42',
      returnUrl: 'https://example.com/return',
      orderId: '42',
      customerPhone: '79001234567',
      idempotenceKey: 'key-3',
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.receipt.tax_system_code).toBe(2);
    for (const item of body.receipt.items) {
      expect(item.vat_code).toBe(1);
    }
  });
});

describe('capturePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YUKASSA_SHOP_ID = 'test_shop';
    process.env.YUKASSA_SECRET_KEY = 'test_secret';

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'pay_123', status: 'succeeded' }),
      text: async () => 'ok',
    });
  });

  it('Test 4: calls POST /payments/{paymentId}/capture with correct URL', async () => {
    await capturePayment('pay_123', 'capture-key-1');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.yookassa.ru/v3/payments/pay_123/capture');
    expect(options.method).toBe('POST');
  });

  it('Test 5: sends Idempotence-Key header', async () => {
    await capturePayment('pay_123', 'capture-key-2');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Idempotence-Key']).toBe('capture-key-2');
  });
});

describe('cancelPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YUKASSA_SHOP_ID = 'test_shop';
    process.env.YUKASSA_SECRET_KEY = 'test_secret';

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'pay_123', status: 'canceled' }),
      text: async () => 'ok',
    });
  });

  it('Test 6: calls POST /payments/{paymentId}/cancel', async () => {
    await cancelPayment('pay_123', 'cancel-key-1');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.yookassa.ru/v3/payments/pay_123/cancel');
    expect(options.method).toBe('POST');
  });
});

describe('createPayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YUKASSA_SHOP_ID = 'test_shop';
    process.env.YUKASSA_SECRET_KEY = 'test_secret';
    process.env.YUKASSA_PAYOUT_AGENT_ID = 'test_agent';
    process.env.YUKASSA_PAYOUT_SECRET = 'test_payout_secret';

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'po_456', status: 'pending' }),
      text: async () => 'ok',
    });
  });

  it('Test 7: uses YUKASSA_PAYOUT_AGENT_ID (not SHOP_ID) for auth', async () => {
    await createPayout({
      amount: 1500,
      cardSynonym: 'card_synonym_abc',
      orderId: '42',
      workerPhone: '79009876543',
      description: 'Выплата по заказу #42',
      idempotenceKey: 'payout-key-1',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, options] = mockFetch.mock.calls[0];
    const expectedAuth = Buffer.from('test_agent:test_payout_secret').toString('base64');
    expect(options.headers['Authorization']).toBe(`Basic ${expectedAuth}`);
  });

  it('Test 8: calls payouts.yookassa.ru (not api.yookassa.ru)', async () => {
    await createPayout({
      amount: 1500,
      cardSynonym: 'card_synonym_abc',
      orderId: '42',
      workerPhone: '79009876543',
      description: 'Выплата по заказу #42',
      idempotenceKey: 'payout-key-2',
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('payouts.yookassa.ru');
    expect(url).not.toContain('api.yookassa.ru');
  });

  it('Test 9: sends card_synonym in payout_destination', async () => {
    await createPayout({
      amount: 1500,
      cardSynonym: 'card_synonym_abc',
      orderId: '42',
      workerPhone: '79009876543',
      description: 'Выплата по заказу #42',
      idempotenceKey: 'payout-key-3',
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.payout_destination).toBeDefined();
    expect(body.payout_destination.type).toBe('bank_card');
    expect(body.payout_destination.card.number).toBe('card_synonym_abc');
  });
});
