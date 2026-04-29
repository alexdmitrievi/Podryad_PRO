import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueJob } from '../job-queue';
import { handleJob } from '../job-worker';
import { getServiceClient } from '../supabase';
import { getChannelRouter } from '../channels';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../channels', () => ({
  getChannelRouter: vi.fn(),
}));

describe('enqueueJob', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('inserts a job_queue row with sane defaults', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'job-1', job_type: 'dispute.opened' },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    vi.mocked(getServiceClient).mockReturnValue({ from } as never);

    const result = await enqueueJob({
      queueName: 'disputes',
      jobType: 'dispute.opened',
      payload: { order_id: 'ORD-1' },
      sourceTable: 'orders',
      sourceId: 'ORD-1',
    });

    expect(from).toHaveBeenCalledWith('job_queue');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        queue_name: 'disputes',
        job_type: 'dispute.opened',
        payload: { order_id: 'ORD-1' },
        priority: 100,
        max_attempts: 8,
        source_table: 'orders',
        source_id: 'ORD-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 'job-1', job_type: 'dispute.opened' }),
    );
  });
});

describe('handleJob', () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    send.mockReset();
    send.mockResolvedValue({ success: true, channel: 'telegram', latency_ms: 1 });
    vi.mocked(getChannelRouter).mockReturnValue({ send } as never);
    process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
    process.env.MAX_ADMIN_USER_ID = 'max-admin';
  });

  it('broadcasts dispute opened notifications to admin telegram and max', async () => {
    await handleJob({
      id: 'job-1',
      job_type: 'dispute.opened',
      payload: {
        order_id: 'ORD-1',
        dispute_id: 'DSP-1',
        initiated_by: 'customer',
        reason: 'Некачественная работа',
        description: 'Короткое описание',
      },
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'telegram',
        chat_id: '12345',
        text: expect.stringContaining('Открыт новый спор'),
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'max',
        chat_id: 'max-admin',
        text: expect.stringContaining('Открыт новый спор'),
      }),
    );
  });

  it('sends payment link to preferred telegram recipient', async () => {
    await handleJob({
      id: 'job-2',
      job_type: 'customer.send_payment_link',
      payload: {
        order_id: 'ORD-2',
        access_token: 'abc123',
        preferred_contact: 'telegram',
        messenger_id: '777000',
        display_price: 5400,
      },
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'telegram',
        chat_id: '777000',
        text: expect.stringContaining('Заказ готов к оплате'),
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('https://podryad.pro/my/abc123'),
      }),
    );
  });

  it('broadcasts payment held notifications to admin channels', async () => {
    await handleJob({
      id: 'job-3',
      job_type: 'notify.payment_held',
      payload: {
        order_id: 'ORD-3',
        customer_name: 'Иван',
        customer_phone: '79990001122',
        work_type: 'labor',
        amount: 7000,
        address: 'ул. Ленина, 1',
        paid_at: '2026-04-29T10:00:00.000Z',
      },
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'telegram',
        text: expect.stringContaining('Платёж удержан'),
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'max',
        text: expect.stringContaining('Платёж удержан'),
      }),
    );
  });
});