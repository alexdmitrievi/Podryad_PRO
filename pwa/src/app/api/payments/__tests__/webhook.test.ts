/**
 * Tests for POST /api/payments/callback
 * Covers: IP rejection, escrow events (waiting_for_capture, canceled, succeeded),
 * and preservation of the existing non-escrow payment.succeeded handler.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock lib/db ──
vi.mock('@/lib/db', () => ({
  updateOrder: vi.fn().mockResolvedValue(undefined),
  insertEscrowLedger: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock lib/supabase (used by non-escrow path) ──
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
});
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({
  update: mockUpdate,
  insert: mockInsert,
});

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

// Import after mocks are set up
import { POST } from '../callback/route';
import { isYooKassaIP } from '@/lib/yookassa-ip';
import { updateOrder, insertEscrowLedger } from '@/lib/db';

// ── Helpers ──

function makeRequest(body: object, ip?: string): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (ip) {
    headers['x-forwarded-for'] = ip;
  }
  return new Request('http://localhost/api/payments/callback', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function makePaymentEvent(event: string, overrides: object = {}) {
  return {
    type: 'notification',
    event,
    object: {
      id: 'pay_test_123',
      status: 'waiting_for_capture',
      amount: { value: '1100.00', currency: 'RUB' },
      metadata: { order_id: 'order-abc', type: 'escrow' },
      ...overrides,
    },
  };
}

// ── Tests ──

describe('POST /api/payments/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set test environment so IP check is NOT skipped for non-dev tests
    // NODE_ENV is 'test' by default in vitest
  });

  // Test 1: IP rejection — non-YooKassa IP returns 200 but does NOT update DB
  it('rejects non-YooKassa IP with 200 OK but does not call updateOrder', async () => {
    const req = makeRequest(
      makePaymentEvent('payment.waiting_for_capture'),
      '1.2.3.4' // Not a YooKassa IP
    );

    const res = await POST(req);
    const data = await res.json() as { status: string };

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(updateOrder).not.toHaveBeenCalled();
    expect(insertEscrowLedger).not.toHaveBeenCalled();
  });

  // Test 2: payment.waiting_for_capture with metadata.type='escrow'
  // Sets escrow_status='payment_held', inserts hold ledger entry
  it('handles payment.waiting_for_capture for escrow payment', async () => {
    // Use a known YooKassa IP: 185.71.76.1 (in 185.71.76.0/27)
    const req = makeRequest(
      makePaymentEvent('payment.waiting_for_capture', {
        id: 'pay_hold_001',
        amount: { value: '1100.00', currency: 'RUB' },
        metadata: { order_id: 'order-hold', type: 'escrow' },
      }),
      '185.71.76.1'
    );

    const res = await POST(req);
    const data = await res.json() as { status: string };

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');

    expect(updateOrder).toHaveBeenCalledWith('order-hold', expect.objectContaining({
      escrow_status: 'payment_held',
      yookassa_payment_id: 'pay_hold_001',
    }));

    expect(insertEscrowLedger).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'order-hold',
      type: 'hold',
      amount: 1100,
      yookassa_operation_id: 'pay_hold_001',
    }));
  });

  // Test 3: payment.canceled with metadata.type='escrow'
  // Sets escrow_status='cancelled', inserts release ledger entry
  it('handles payment.canceled for escrow payment', async () => {
    const req = makeRequest(
      {
        type: 'notification',
        event: 'payment.canceled',
        object: {
          id: 'pay_cancel_001',
          status: 'canceled',
          amount: { value: '1100.00', currency: 'RUB' },
          metadata: { order_id: 'order-cancel', type: 'escrow' },
        },
      },
      '185.71.76.1'
    );

    const res = await POST(req);
    const data = await res.json() as { status: string };

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');

    expect(updateOrder).toHaveBeenCalledWith('order-cancel', expect.objectContaining({
      escrow_status: 'cancelled',
    }));

    expect(insertEscrowLedger).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'order-cancel',
      type: 'release',
      amount: 1100,
      yookassa_operation_id: 'pay_cancel_001',
    }));
  });

  // Test 4: payment.succeeded with metadata.type='escrow'
  // Sets escrow_status='completed', inserts capture ledger entry
  it('handles payment.succeeded for escrow payment (capture confirmation)', async () => {
    const req = makeRequest(
      {
        type: 'notification',
        event: 'payment.succeeded',
        object: {
          id: 'pay_capture_001',
          status: 'succeeded',
          amount: { value: '1100.00', currency: 'RUB' },
          metadata: { order_id: 'order-capture', type: 'escrow' },
          paid: true,
        },
      },
      '185.71.76.1'
    );

    const res = await POST(req);
    const data = await res.json() as { status: string };

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');

    expect(updateOrder).toHaveBeenCalledWith('order-capture', expect.objectContaining({
      escrow_status: 'completed',
      payment_captured: true,
    }));

    expect(insertEscrowLedger).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'order-capture',
      type: 'capture',
      amount: 1100,
      yookassa_operation_id: 'pay_capture_001',
    }));
  });

  // Test 5: payment.succeeded WITHOUT metadata.type='escrow'
  // Existing non-escrow handler runs (order status: pending -> paid, payments table insert)
  it('handles payment.succeeded for non-escrow payment (existing behavior preserved)', async () => {
    const req = makeRequest(
      {
        type: 'notification',
        event: 'payment.succeeded',
        object: {
          id: 'pay_nonescrow_001',
          status: 'succeeded',
          amount: { value: '500.00', currency: 'RUB' },
          metadata: { order_id: 'order-nonescrow' }, // no type: 'escrow'
          paid: true,
          created_at: '2026-04-01T10:00:00Z',
        },
      },
      '185.71.76.1'
    );

    const res = await POST(req);
    const data = await res.json() as { status: string };

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');

    // Escrow functions should NOT be called for non-escrow payments
    expect(updateOrder).not.toHaveBeenCalled();
    expect(insertEscrowLedger).not.toHaveBeenCalled();

    // The existing DB path (getServiceClient) should have been used
    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockFrom).toHaveBeenCalledWith('payments');
  });
});

// ── isYooKassaIP unit tests ──
// NODE_ENV in vitest is 'test' (not 'development'), so IP check IS active.
// The skip-in-development branch is NOT triggered in these tests.

describe('isYooKassaIP', () => {
  it('accepts 185.71.76.1 (in 185.71.76.0/27)', () => {
    expect(isYooKassaIP('185.71.76.1')).toBe(true);
  });

  it('accepts 185.71.77.1 (in 185.71.77.0/27)', () => {
    expect(isYooKassaIP('185.71.77.1')).toBe(true);
  });

  it('accepts 77.75.153.1 (in 77.75.153.0/25)', () => {
    expect(isYooKassaIP('77.75.153.1')).toBe(true);
  });

  it('accepts 77.75.156.11 (exact)', () => {
    expect(isYooKassaIP('77.75.156.11')).toBe(true);
  });

  it('accepts 77.75.156.35 (exact)', () => {
    expect(isYooKassaIP('77.75.156.35')).toBe(true);
  });

  it('rejects 1.2.3.4', () => {
    expect(isYooKassaIP('1.2.3.4')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isYooKassaIP('')).toBe(false);
  });
});
