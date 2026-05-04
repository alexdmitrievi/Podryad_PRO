import { NextResponse } from 'next/server';
import { getTelegramConfig, getMaxConfig } from '@/lib/channels/config';
import { log } from '@/lib/logger';

interface BotHealth {
  ok: boolean;
  channel: string;
  me: { ok: boolean; username?: string; error?: string };
  webhook: { ok: boolean; url?: string; pending?: number; error?: string };
  config: { enabled: boolean; hasToken: boolean; hasSecret: boolean };
}

/**
 * GET /api/health/bot
 * Checks bot connectivity and webhook registration status for all channels.
 * Returns 200 if all configured channels are healthy.
 * Returns 503 if any configured channel has issues.
 */
export async function GET() {
  const results: BotHealth[] = [];
  let allHealthy = true;

  // Telegram
  const tgConfig = getTelegramConfig();
  const tgHealth = await checkTelegram(tgConfig);
  results.push(tgHealth);
  if (tgConfig.enabled && !tgHealth.ok) allHealthy = false;

  // MAX
  const maxConfig = getMaxConfig();
  const maxHealth = await checkMax(maxConfig);
  results.push(maxHealth);
  if (maxConfig.enabled && !maxHealth.ok) allHealthy = false;

  return NextResponse.json(
    {
      ok: allHealthy,
      channels: results,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 },
  );
}

async function checkTelegram(config: ReturnType<typeof getTelegramConfig>): Promise<BotHealth> {
  const result: BotHealth = {
    ok: false,
    channel: 'telegram',
    me: { ok: false },
    webhook: { ok: false },
    config: { enabled: config.enabled, hasToken: !!config.botToken, hasSecret: !!process.env.TELEGRAM_WEBHOOK_SECRET },
  };

  if (!config.enabled) {
    result.me.error = 'TELEGRAM_BOT_TOKEN not configured';
    result.webhook.error = 'skipped (channel disabled)';
    return result;
  }

  // Check getMe
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${config.apiBase}/getMe`, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    if (json.ok) {
      result.me = { ok: true, username: json.result?.username };
    } else {
      result.me = { ok: false, error: json.description || `HTTP ${res.status}` };
    }
  } catch (err: unknown) {
    result.me = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Check getWebhookInfo
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${config.apiBase}/getWebhookInfo`, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    if (json.ok) {
      const info = json.result;
      result.webhook = {
        ok: !!info.url,
        url: info.url || undefined,
        pending: info.pending_update_count ?? 0,
      };
      if (!info.url) {
        result.webhook.error = 'Webhook URL not set — register via BotFather or scripts/register-webhooks.mjs';
      }
      if (info.last_error_date) {
        result.webhook.error = `Last error (${new Date(info.last_error_date * 1000).toISOString()}): ${info.last_error_message}`;
      }
    } else {
      result.webhook = { ok: false, error: json.description || `HTTP ${res.status}` };
    }
  } catch (err: unknown) {
    result.webhook = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  result.ok = result.me.ok && result.webhook.ok;

  if (!result.ok) {
    log.warn('[Health/Bot] Telegram unhealthy', { me: result.me, webhook: result.webhook });
  }

  return result;
}

async function checkMax(config: ReturnType<typeof getMaxConfig>): Promise<BotHealth> {
  const result: BotHealth = {
    ok: false,
    channel: 'max',
    me: { ok: false },
    webhook: { ok: false },
    config: { enabled: config.enabled, hasToken: !!config.botToken, hasSecret: !!process.env.MAX_WEBHOOK_SECRET },
  };

  if (!config.enabled) {
    result.me.error = 'MAX_BOT_TOKEN not configured';
    result.webhook.error = 'skipped (channel disabled)';
    return result;
  }

  // Debug: include token fingerprint in response (safe — only length + first chars)
  result.config = {
    ...result.config,
    tokenLen: config.botToken.length,
    tokenPrefix: config.botToken.substring(0, 6),
  } as BotHealth['config'];

  // Check getMe
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${config.apiBase}/me?access_token=${encodeURIComponent(config.botToken)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const json = await res.json();
    result.me = { ok: res.ok && (!!json.user_id || !!json.name), username: json.name || json.username };
    if (!result.me.ok) {
      result.me.error = json.message || json.description || `HTTP ${res.status}`;
    }
  } catch (err: unknown) {
    result.me = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Check webhook subscriptions
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${config.apiBase}/subscriptions?access_token=${encodeURIComponent(config.botToken)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const json = await res.json();
    // Response is an array or object with subscriptions
    const subs = Array.isArray(json) ? json : (json.subscriptions ?? []);
    const webhookSub = subs.find((s: { url?: string }) => s.url);
    result.webhook = {
      ok: !!webhookSub,
      url: webhookSub?.url,
    };
    if (!webhookSub) {
      result.webhook.error = 'Webhook URL not set — run npm run setup:webhooks';
    }
  } catch (err: unknown) {
    result.webhook = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  result.ok = result.me.ok && result.webhook.ok;

  if (!result.ok) {
    log.warn('[Health/Bot] MAX unhealthy', { me: result.me, webhook: result.webhook });
  }

  return result;
}
