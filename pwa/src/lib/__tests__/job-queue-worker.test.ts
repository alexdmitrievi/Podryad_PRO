import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueJob, failJob, getRetryDelayMs } from '../job-queue';
import { handleJob, processClaimedJobs } from '../job-worker';
import type { JobQueueRow } from '../job-queue';
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

  it('falls back to manual admin notification when messenger is missing', async () => {
    const result = await handleJob({
      id: 'job-2-fallback',
      job_type: 'customer.send_payment_link',
      payload: {
        order_id: 'ORD-2-FALLBACK',
        access_token: 'fallback-token',
        preferred_contact: 'telegram',
        messenger_id: null,
      },
    });

    expect(result).toEqual(expect.objectContaining({ manual: true }));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'telegram',
        chat_id: '12345',
        text: expect.stringContaining('Ручная отправка платёжной ссылки'),
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

// ─── failJob / retry / dead-letter ────────────────────────────────────────────

describe('failJob', () => {
  function makeUpdateChain(mockData = {}) {
    const eq = vi.fn().mockResolvedValue({ error: null, ...mockData });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(getServiceClient).mockReturnValue({ from } as never);
    return { from, update, eq };
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns "retry" and sets status=pending with future run_at when attempts < max', async () => {
    const { update } = makeUpdateChain();
    const job = { id: 'job-retry', attempts: 2, max_attempts: 8 };
    const state = await failJob(job, 'connection timeout');
    expect(state).toBe('retry');
    const updateArg = update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe('pending');
    expect(typeof updateArg.run_at).toBe('string');
    // run_at must be in the future
    expect(new Date(updateArg.run_at as string).getTime()).toBeGreaterThan(Date.now());
    expect(updateArg.last_error).toBe('connection timeout');
  });

  it('returns "dead" and sets status=dead when attempts >= max_attempts', async () => {
    const { update } = makeUpdateChain();
    const job = { id: 'job-dead', attempts: 8, max_attempts: 8 };
    const state = await failJob(job, 'permanent failure');
    expect(state).toBe('dead');
    const updateArg = update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe('dead');
    expect(updateArg.last_error).toBe('permanent failure');
    expect('run_at' in updateArg).toBe(false);
  });

  it('getRetryDelayMs returns backoff schedule clamped at last slot', () => {
    expect(getRetryDelayMs(1)).toBe(30_000);
    expect(getRetryDelayMs(2)).toBe(120_000);
    expect(getRetryDelayMs(3)).toBe(600_000);
    expect(getRetryDelayMs(99)).toBe(21_600_000); // last slot = 6 h
  });
});

// ─── processClaimedJobs retry/dead counting ───────────────────────────────────

describe('processClaimedJobs', () => {
  const send = vi.fn();

  function makeJobRow(overrides: Partial<JobQueueRow>): JobQueueRow {
    return {
      id: 'job-1',
      queue_name: 'notifications',
      job_type: 'notify.order_created',
      payload: { order_id: 'ORD-1', phone: '79990001111' },
      priority: 100,
      status: 'processing',
      run_at: new Date().toISOString(),
      attempts: 1,
      max_attempts: 8,
      ...overrides,
    };
  }

  function makeUpdateEq() {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const selectSingle = { single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }) };
    const selectResult = { select: vi.fn(() => selectSingle) };
    const insert = vi.fn(() => selectResult);
    const from = vi.fn((table: string) => table === 'job_queue' ? { insert, update } : { update });
    vi.mocked(getServiceClient).mockReturnValue({ from } as never);
    return { from, update, eq };
  }

  beforeEach(() => {
    vi.resetAllMocks();
    send.mockReset();
    send.mockResolvedValue({ success: true, channel: 'telegram', latency_ms: 1 });
    vi.mocked(getChannelRouter).mockReturnValue({ send } as never);
    process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
    process.env.MAX_ADMIN_USER_ID = '';
  });

  it('counts retried and dead correctly when jobs fail', async () => {
    // job1: attempts=1 → will be retried
    // job2: attempts=8 → will be dead-lettered
    const failingJob1 = makeJobRow({ id: 'j1', job_type: 'unknown.bad_type', attempts: 1, max_attempts: 8 });
    const failingJob2 = makeJobRow({ id: 'j2', job_type: 'unknown.bad_type', attempts: 8, max_attempts: 8 });

    makeUpdateEq();

    const result = await processClaimedJobs([failingJob1, failingJob2]);
    expect(result.completed).toBe(0);
    expect(result.retried).toBe(1);
    expect(result.dead).toBe(1);
    expect(result.failed_job_ids).toEqual(['j1', 'j2']);
  });
});

// ─── customer.send_payment_link manual fallback ───────────────────────────────

describe('handleJob customer.send_payment_link fallback', () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    send.mockReset();
    send.mockResolvedValue({ success: true, channel: 'telegram', latency_ms: 1 });
    vi.mocked(getChannelRouter).mockReturnValue({ send } as never);
    process.env.TELEGRAM_ADMIN_CHAT_ID = 'admin-99';
    process.env.MAX_ADMIN_USER_ID = '';
  });

  it('sends manual fallback to admin when preferred_contact is missing', async () => {
    const result = await handleJob({
      id: 'job-fallback-1',
      job_type: 'customer.send_payment_link',
      payload: {
        order_id: 'ORD-FB-1',
        access_token: 'tok123',
        preferred_contact: '',
        messenger_id: '',
        display_price: 3000,
      },
    });

    expect(result).toMatchObject({ delivered: 1, manual: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'telegram',
        chat_id: 'admin-99',
        text: expect.stringContaining('Ручная отправка'),
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('https://podryad.pro/my/tok123'),
      }),
    );
  });

  it('sends manual fallback when preferred_contact is max but messenger_id is empty', async () => {
    const result = await handleJob({
      id: 'job-fallback-2',
      job_type: 'customer.send_payment_link',
      payload: {
        order_id: 'ORD-FB-2',
        access_token: 'tok456',
        preferred_contact: 'max',
        messenger_id: '',
        display_price: null,
      },
    });

    expect(result).toMatchObject({ delivered: 1, manual: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'telegram', chat_id: 'admin-99' }),
    );
  });
});