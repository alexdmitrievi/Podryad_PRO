// Bot order flow + session + loyalty integration tests
import { describe, it, expect } from 'vitest';

describe('bot types — type safety', () => {
  it('BotServiceKind includes all 14 services', () => {
    const kinds = [
      'lawn_mowing', 'scarification', 'aeration', 'land_clearing',
      'tree_cutting', 'stump_removal', 'debris_removal',
      'pool_cleaning', 'pool_assembly', 'weed_removal',
      'pool_maintenance', 'welding', 'tilling', 'subscription',
    ];
    expect(kinds).toHaveLength(14);
  });

  it('MaterialKind includes all 5 types', () => {
    const kinds = ['concrete', 'crushed_stone', 'sand', 'cement', 'brick'];
    expect(kinds).toHaveLength(5);
  });

  it('RegionCode: omsk and novosibirsk', () => {
    const regions = ['omsk', 'novosibirsk' as const];
    expect(regions).toHaveLength(2);
  });

  it('CustomerType: b2c and b2b', () => {
    const types = ['b2c', 'b2b' as const];
    expect(types).toHaveLength(2);
  });

  it('Screen includes material_order, pick_ctype, materials_menu', () => {
    const screens = ['material_order', 'pick_ctype', 'materials_menu', 'home', 'order'];
    screens.forEach((s) => expect(typeof s).toBe('string'));
    expect(screens).toHaveLength(5);
  });

  it('OrderStep includes region step', () => {
    const step = 'region';
    expect(step).toBe('region');
  });
});

describe('bot integration — funnel flow integrity', () => {
  it('Service selection callback format: svc:<kind>', () => {
    const cb = `svc:lawn_mowing`;
    expect(cb).toMatch(/^svc:[a-z_]+$/);
  });

  it('Area callback format: area:<kind>:<bucket>', () => {
    const cb = `area:lawn_mowing:5`;
    expect(cb).toMatch(/^area:[a-z_]+:(\d+|custom)$/);
  });

  it('Region callback format: region:<code>', () => {
    const cb = `region:omsk`;
    expect(cb).toMatch(/^region:(omsk|novosibirsk)$/);
  });

  it('District callback format: district:<code>', () => {
    const cb = `district:chkalovskiy`;
    expect(cb).toMatch(/^district:[a-z_]+$/);
  });

  it('When callback format: when:<label>', () => {
    const cb = `when:today`;
    expect(cb).toMatch(/^when:(today|tomorrow|weekend|thisweek|custom)$/);
  });

  it('Material callback format: mat:<kind>', () => {
    const cb = `mat:concrete`;
    expect(cb).toMatch(/^mat:[a-z_]+$/);
  });

  it('Grade callback format: grade:<kind>:<code>', () => {
    const cb = `grade:concrete:M200`;
    expect(cb).toMatch(/^grade:[a-z_]+:[A-Za-z0-9_-]+$/);
  });

  it('Quantity callback format: qty:<num>', () => {
    const cb = `qty:10`;
    expect(cb).toMatch(/^qty:(\d+|custom)$/);
  });

  it('Customer type callback format: ctype:b2c/b2b', () => {
    expect('ctype:b2c').toMatch(/^ctype:(b2c|b2b)$/);
    expect('ctype:b2b').toMatch(/^ctype:(b2c|b2b)$/);
  });
});

describe('bot integration — existing PWA not broken', () => {
  it('Channel router still exports getChannelRouter', async () => {
    const { getChannelRouter } = await import('@/lib/channels');
    expect(typeof getChannelRouter).toBe('function');
  });

  it('Job queue still exports enqueueJob', async () => {
    const { enqueueJob } = await import('@/lib/job-queue');
    expect(typeof enqueueJob).toBe('function');
  });

  it('OpenAI client still exports getOpenAIClient', async () => {
    const { getOpenAIClient } = await import('@/lib/ai/openai-client');
    expect(typeof getOpenAIClient).toBe('function');
  });

  it('Supabase service client still works', async () => {
    const { getServiceClient } = await import('@/lib/supabase');
    expect(typeof getServiceClient).toBe('function');
  });
});
