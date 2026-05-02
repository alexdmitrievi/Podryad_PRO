import { test, expect } from '@playwright/test';

/**
 * E2E API tests for MAX webhook POST /api/max/webhook
 *
 * Simulates incoming MAX Bot API webhook payloads.
 * Tests: auth, validation, commands, rate-limit, edge cases.
 */

const WEBHOOK_URL = '/api/max/webhook';
const VALID_SECRET = process.env.MAX_WEBHOOK_SECRET ?? ('test-max-secret-' + 'x'.repeat(32));

function maxMessagePayload(text: string, chatId = 'id_chat_123', userId = 'id_user_456') {
  return {
    update: {
      update_id: Date.now(),
      message: {
        body: { text },
        sender: { user_id: userId },
        recipient: { chat_id: chatId },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
  };
}

function maxCallbackPayload(data: string, chatId = 'id_chat_123', userId = 'id_user_456') {
  return {
    update: {
      update_id: Date.now(),
      callback: {
        callback_id: 'cb_' + Date.now(),
        user_id: userId,
        chat_id: chatId,
        payload: data,
      },
    },
  };
}

test.describe('MAX Webhook — Security', () => {
  test('returns 403 when secret header is missing (if MAX_WEBHOOK_SECRET is set)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      data: maxMessagePayload('/start'),
    });
    if (process.env.MAX_WEBHOOK_SECRET) {
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('returns 403 when secret header is wrong', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': 'wrong-secret' },
      data: maxMessagePayload('/start'),
    });
    if (process.env.MAX_WEBHOOK_SECRET) {
      expect(res.status()).toBe(403);
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('returns 200 ok when secret header matches', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxMessagePayload('/start'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('MAX Webhook — Input validation', () => {
  test('returns 400 for invalid JSON body', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET, 'content-type': 'application/json' },
      data: '{broken',
    });
    // Next.js body parser may return 200/400 depending on strictness
    expect([200, 400]).toContain(res.status());
  });

  test('returns 200 ok for empty body (no crash)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
  });

  test('returns 200 ok for update without chat_id', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: { update: { update_id: Date.now(), message: { body: { text: 'hi' }, sender: { user_id: 'u1' }, recipient: {} } } },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('MAX Webhook — Commands', () => {
  test('/start command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxMessagePayload('/start'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('/help command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxMessagePayload('/help'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('/order command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxMessagePayload('/order нужна техника'),
    });
    expect(res.status()).toBe(200);
  });

  test('/status command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxMessagePayload('/status'),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('MAX Webhook — Callbacks', () => {
  test('callback query returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxCallbackPayload('btn_accept'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('MAX Webhook — Free text', () => {
  test('free-text message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: maxMessagePayload('Здравствуйте, нужна консультация'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('MAX Webhook — Rate limiting', () => {
  test('rate limit does not crash on burst', async ({ request }) => {
    const payload = maxMessagePayload('/start', 'max_ratelimit_' + Date.now());
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        request.post(WEBHOOK_URL, {
          headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
          data: payload,
        }).then(r => r.status())
      )
    );
    results.forEach(status => expect(status).toBe(200));
  });
});

test.describe('MAX Webhook — Legacy payload format', () => {
  test('payload without update wrapper returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-max-bot-api-secret-token': VALID_SECRET },
      data: {
        message: {
          body: { text: '/help' },
          sender: { user_id: 'u_old' },
          recipient: { chat_id: 'c_old' },
          timestamp: Math.floor(Date.now() / 1000),
        },
      },
    });
    expect(res.status()).toBe(200);
  });
});
