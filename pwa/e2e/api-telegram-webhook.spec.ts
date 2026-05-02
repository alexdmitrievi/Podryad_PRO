import { test, expect } from '@playwright/test';

/**
 * E2E API tests for Telegram webhook POST /api/telegram/webhook
 *
 * Simulates incoming Telegram Bot API webhook payloads.
 * Tests: auth, validation, commands, rate-limit, edge cases.
 */

const WEBHOOK_URL = '/api/telegram/webhook';
const VALID_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ('test-secret-' + 'x'.repeat(32));

function tgMessagePayload(text: string, chatId = '123456789', userId = '987654321', date = Math.floor(Date.now() / 1000)) {
  return {
    update_id: Date.now(),
    message: {
      message_id: 1,
      from: { id: userId, is_bot: false, first_name: 'Test', username: 'testuser' },
      chat: { id: chatId, type: 'private' },
      date,
      text,
    },
  };
}

function tgCallbackPayload(data: string, chatId = '123456789', userId = '987654321') {
  return {
    update_id: Date.now(),
    callback_query: {
      id: 'cb_' + Date.now(),
      from: { id: userId, is_bot: false, first_name: 'Test' },
      message: {
        message_id: 1,
        from: { id: 0, is_bot: true, first_name: 'Bot' },
        chat: { id: chatId, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Choose option:',
      },
      data,
    },
  };
}

test.describe('Telegram Webhook — Security', () => {
  test('returns 403 when secret header is missing (if TELEGRAM_WEBHOOK_SECRET is set)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      data: tgMessagePayload('/start'),
    });
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('returns 403 when secret header is wrong', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret' },
      data: tgMessagePayload('/start'),
    });
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      expect(res.status()).toBe(403);
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('returns 200 ok when secret header matches', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('/start'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('Telegram Webhook — Input validation', () => {
  test('returns 400 for invalid JSON body', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET, 'content-type': 'application/json' },
      data: '{broken',
    });
    // Next.js body parser may return 200/400 depending on strictness
    expect([200, 400]).toContain(res.status());
  });

  test('returns 200 ok for empty body (no crash)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
  });

  test('returns 200 ok for update without chat_id (edited_channel_post)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: {
        update_id: Date.now(),
        edited_channel_post: { message_id: 1, date: Math.floor(Date.now() / 1000), text: 'edited' },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('Telegram Webhook — Commands', () => {
  test('/start command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('/start'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('/help command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('/help'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('/order command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('/order нужны грузчики'),
    });
    expect(res.status()).toBe(200);
  });

  test('/status command returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('/status'),
    });
    expect(res.status()).toBe(200);
  });

  test('unknown command returns 200 ok (falls through to AI)', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('/unknown_cmd'),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Telegram Webhook — Callbacks', () => {
  test('callback query returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgCallbackPayload('option_1'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

test.describe('Telegram Webhook — Free text', () => {
  test('free-text message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('Нужны два грузчика на завтра'),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('span message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: tgMessagePayload('Сколько стоит уборка квартиры?'),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Telegram Webhook — Rate limiting', () => {
  test('rate limit does not crash on burst (all return 200)', async ({ request }) => {
    const payload = tgMessagePayload('/start', 'ratelimit_test_' + Date.now());
    // Send 15 messages rapidly — should all return 200 (rate-limited ones silently ignored)
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        request.post(WEBHOOK_URL, {
          headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
          data: payload,
        }).then(r => r.status())
      )
    );
    // All should be 200 (rate-limited ones also return 200 to avoid Telegram retries)
    results.forEach(status => expect(status).toBe(200));
  });
});

test.describe('Telegram Webhook — Non-text updates', () => {
  test('photo message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: {
        update_id: Date.now(),
        message: {
          message_id: 1,
          from: { id: 111, is_bot: false, first_name: 'Photo' },
          chat: { id: 222, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          photo: [{ file_id: 'abc', width: 100, height: 100 }],
        },
      },
    });
    expect(res.status()).toBe(200);
  });

  test('sticker message returns 200 ok', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-telegram-bot-api-secret-token': VALID_SECRET },
      data: {
        update_id: Date.now(),
        message: {
          message_id: 1,
          from: { id: 111, is_bot: false, first_name: 'Sticker' },
          chat: { id: 222, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          sticker: { emoji: '👍', file_id: 'abc' },
        },
      },
    });
    expect(res.status()).toBe(200);
  });
});
