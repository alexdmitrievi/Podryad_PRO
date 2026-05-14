import { test, expect } from '@playwright/test';

/**
 * E2E API tests for Avito webhook POST /api/avito/webhook
 *
 * Simulates incoming Avito Messenger webhook payloads.
 * Tests: auth, validation, commands, callbacks, free-text, rate-limit, edge cases.
 */

const WEBHOOK_URL = '/api/avito/webhook';
const VALID_SECRET = process.env.AVITO_WEBHOOK_SECRET ?? ('test-avito-secret-' + 'x'.repeat(32));

function avitoMessagePayload(text: string, chatId = 'chat123', userId = 'user456') {
  return {
    payload: {
      value: {
        author_id: userId,
        chat_id: chatId,
        content: { text },
        created: Math.floor(Date.now() / 1000),
      },
    },
  };
}

function avitoCallbackPayload(data: string, chatId = 'chat123', userId = 'user456') {
  return {
    payload: {
      value: {
        author_id: userId,
        chat_id: chatId,
        content: { text: data },
        created: Math.floor(Date.now() / 1000),
      },
    },
  };
}

test.describe('Avito Webhook — Security', () => {
  test('returns 403 when secret header is missing (if AVITO_WEBHOOK_SECRET is set)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      data: avitoMessagePayload('/start'),
    });
    if (process.env.AVITO_WEBHOOK_SECRET) {
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('returns 403 when secret header is wrong', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': 'wrong-secret' },
      data: avitoMessagePayload('/start'),
    });
    if (process.env.AVITO_WEBHOOK_SECRET) {
      expect(res.status()).toBe(403);
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('returns 200 ok when secret header matches', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('/start'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('Avito Webhook — Input validation', () => {
  test('returns 200 or 400 for invalid JSON body (no crash)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET, 'content-type': 'application/json' },
      data: '{broken',
    });
    expect([200, 400]).toContain(res.status());
  });

  test('returns 200 ok for empty body (no crash)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
  });

  test('returns 200 ok for update without chat_id', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: { payload: { value: { author_id: 'u1', content: { text: 'hi' }, created: Math.floor(Date.now() / 1000) } } },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('Avito Webhook — Commands', () => {
  test('/start command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('/start'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('/help command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('/help'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('/order command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('/order нужны грузчики'),
    });
    expect(res.status()).toBe(200);
  });

  test('unknown command returns 200 ok (falls through to AI)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('/unknown_cmd'),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Avito Webhook — Callbacks', () => {
  test('callback query returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoCallbackPayload('btn_accept'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('Avito Webhook — Free text', () => {
  test('free-text Russian message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('Нужны два грузчика на завтра'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('question message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: avitoMessagePayload('Сколько стоит уборка квартиры?'),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Avito Webhook — Rate limiting', () => {
  test('rate limit does not crash on burst (all return 200)', async ({ request }) => {
    const payload = avitoMessagePayload('/start', 'avito_ratelimit_' + Date.now());
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        request.post(WEBHOOK_URL, {
          headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
          data: payload,
        }).then(r => r.status())
      )
    );
    results.forEach(status => expect(status).toBe(200));
  });
});

test.describe('Avito Webhook — Edge cases', () => {
  test('empty text content returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: {
        payload: {
          value: {
            author_id: 'u1',
            chat_id: 'c1',
            content: { text: '' },
            created: Math.floor(Date.now() / 1000),
          },
        },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('missing content field returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-avito-bot-api-secret-token': VALID_SECRET },
      data: {
        payload: {
          value: {
            author_id: 'u1',
            chat_id: 'c1',
            created: Math.floor(Date.now() / 1000),
          },
        },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
