/**
 * Webhook Registration Script
 *
 * Registers Telegram and MAX bot webhook URLs with their respective platforms.
 *
 * Usage:
 *   dotenv -e pwa/.env.local -- node scripts/register-webhooks.mjs
 *   dotenv -e pwa/.env.local -- node scripts/register-webhooks.mjs --telegram-only
 *   dotenv -e pwa/.env.local -- node scripts/register-webhooks.mjs --max-only
 *   dotenv -e pwa/.env.local -- node scripts/register-webhooks.mjs --check
 *
 * Required env vars:
 *   NEXT_PUBLIC_APP_URL      — app base URL (e.g. https://podryad.pro or http://localhost:3000)
 *   TELEGRAM_BOT_TOKEN       — Telegram bot token from BotFather
 *   TELEGRAM_WEBHOOK_SECRET  — random secret for webhook validation
 *   MAX_BOT_TOKEN            — MAX bot access token
 *   MAX_WEBHOOK_SECRET       — random secret for MAX webhook validation
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const MAX_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_SECRET = process.env.MAX_WEBHOOK_SECRET;
const MAX_API_BASE = process.env.MAX_API_BASE || 'https://botapi.max.ru';

const TELEGRAM_ONLY = process.argv.includes('--telegram-only');
const MAX_ONLY = process.argv.includes('--max-only');
const CHECK_ONLY = process.argv.includes('--check');
const DRY_RUN = process.argv.includes('--dry-run');

console.log('═'.repeat(60));
console.log('  Подряд PRO — Webhook Registration');
console.log('═'.repeat(60));
console.log(`  Base URL: ${BASE_URL}`);
console.log('');

let exitCode = 0;

async function telegramGetMe() {
  if (!TG_TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getMe`);
    const json = await res.json();
    return json;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function telegramGetWebhookInfo() {
  if (!TG_TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getWebhookInfo`);
    const json = await res.json();
    return json;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function telegramSetWebhook() {
  if (!TG_TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set' };
  try {
    const body = {
      url: `${BASE_URL}/api/telegram/webhook`,
      allowed_updates: ['message', 'callback_query'],
    };
    if (TG_SECRET) body.secret_token = TG_SECRET;
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function maxGetMe() {
  if (!MAX_TOKEN) return { ok: false, error: 'MAX_BOT_TOKEN not set' };
  try {
    const res = await fetch(`${MAX_API_BASE}/me?access_token=${MAX_TOKEN}`);
    const json = await res.json();
    return { ok: !!json.ok, ...json };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function maxGetWebhookInfo() {
  if (!MAX_TOKEN) return { ok: false, error: 'MAX_BOT_TOKEN not set' };
  try {
    const res = await fetch(`${MAX_API_BASE}/webhook?access_token=${MAX_TOKEN}`);
    const json = await res.json();
    return { ok: true, ...json };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function maxSetWebhook() {
  if (!MAX_TOKEN) return { ok: false, error: 'MAX_BOT_TOKEN not set' };
  try {
    const body = {
      url: `${BASE_URL}/api/max/webhook`,
    };
    const res = await fetch(`${MAX_API_BASE}/webhook?access_token=${MAX_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { ok: true, ...json };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkAll() {
  console.log('📋 Checking current webhook status...\n');

  if (!MAX_ONLY) {
    console.log('── Telegram ──────────────────────────────────');
    const tgMe = await telegramGetMe();
    if (tgMe.ok) {
      console.log(`✅ Bot: @${tgMe.result.username} (${tgMe.result.first_name})`);
    } else {
      console.log(`❌ Bot check failed: ${tgMe.error || tgMe.description}`);
      exitCode = 1;
    }

    const tgWh = await telegramGetWebhookInfo();
    if (tgWh.ok) {
      const info = tgWh.result;
      console.log(`   Webhook URL:   ${info.url || '(not set)'}`);
      console.log(`   Pending count: ${info.pending_update_count ?? 'N/A'}`);
      console.log(`   Has custom cert: ${info.has_custom_certificate ? 'Yes' : 'No'}`);
      const whErrors = [];
      if (!info.url) whErrors.push('Webhook URL not set');
      if (info.url && info.url !== `${BASE_URL}/api/telegram/webhook`) whErrors.push(`URL mismatch: expected ${BASE_URL}/api/telegram/webhook`);
      if (TG_SECRET && !info.url?.includes) whErrors.push('Secret token may not be configured');
      if (info.last_error_date) whErrors.push(`Last error (${new Date(info.last_error_date * 1000).toISOString()}): ${info.last_error_message}`);
      if (whErrors.length) {
        console.log(`   ⚠️  Issues:`);
        whErrors.forEach(e => console.log(`      - ${e}`));
        exitCode = 1;
      } else if (info.url) {
        console.log('   ✅ Webhook configured correctly');
      }
    } else {
      console.log(`❌ Webhook info: ${tgWh.error || tgWh.description}`);
      exitCode = 1;
    }
    console.log('');
  }

  if (!TELEGRAM_ONLY) {
    console.log('── MAX Messenger ──────────────────────────────');
    const maxMe = await maxGetMe();
    if (maxMe.ok) {
      console.log(`✅ Bot: ${maxMe.name || maxMe.username || '(connected)'}`);
    } else {
      console.log(`❌ Bot check failed: ${maxMe.error || maxMe.description || 'Unknown error'}`);
      exitCode = 1;
    }

    const maxWh = await maxGetWebhookInfo();
    if (maxWh.ok) {
      const info = maxWh;
      console.log(`   Webhook URL: ${info.url || '(not set)'}`);
      if (!info.url) {
        console.log('   ⚠️  Webhook URL not set');
        exitCode = 1;
      } else if (info.url !== `${BASE_URL}/api/max/webhook`) {
        console.log(`   ⚠️  URL mismatch: expected ${BASE_URL}/api/max/webhook`);
        exitCode = 1;
      } else {
        console.log('   ✅ Webhook configured correctly');
      }
    } else {
      console.log(`⚠️  Could not check webhook status: ${maxWh.error || maxWh.description || 'Unknown'}`);
    }
    console.log('');
  }
}

async function registerAll() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made\n' : '🚀 Registering webhooks...\n');

  if (!MAX_ONLY) {
    console.log('── Telegram ──────────────────────────────────');

    if (!TG_TOKEN) {
      console.log('❌ TELEGRAM_BOT_TOKEN is not set. Skipping Telegram.');
      exitCode = 1;
    } else {
      const tgMe = await telegramGetMe();
      if (!tgMe.ok) {
        console.log(`❌ Cannot connect to Telegram Bot API: ${tgMe.error || tgMe.description}`);
        exitCode = 1;
      } else {
        console.log(`   Bot: @${tgMe.result.username}`);

        if (!TG_SECRET) {
          console.log('   ⚠️  TELEGRAM_WEBHOOK_SECRET not set — webhook will be unauthenticated!');
          console.log('      Generate: openssl rand -hex 32');
          console.log('      Set in: BotFather /setwebhook → secret_token');
        }

        if (!DRY_RUN) {
          console.log('   Registering webhook...');
          const result = await telegramSetWebhook();
          if (result.ok) {
            console.log(`   ✅ Webhook registered: ${BASE_URL}/api/telegram/webhook`);
            if (TG_SECRET) console.log('   ✅ Secret token configured');
          } else {
            console.log(`   ❌ Registration failed: ${result.error || result.description}`);
            exitCode = 1;
          }
        } else {
          console.log(`   [DRY RUN] Would register: ${BASE_URL}/api/telegram/webhook`);
        }

        // Verify
        if (!DRY_RUN) {
          const verify = await telegramGetWebhookInfo();
          if (verify.ok) {
            console.log(`   🔍 Verified: ${verify.result.url}`);
            if (verify.result.pending_update_count > 0) {
              console.log(`   ⚠️  ${verify.result.pending_update_count} pending updates (will be delivered)`);
            }
          }
        }
      }
    }
    console.log('');
  }

  if (!TELEGRAM_ONLY) {
    console.log('── MAX Messenger ──────────────────────────────');

    if (!MAX_TOKEN) {
      console.log('❌ MAX_BOT_TOKEN is not set. Skipping MAX.');
      exitCode = 1;
    } else {
      const maxMe = await maxGetMe();
      if (!maxMe.ok) {
        console.log(`❌ Cannot connect to MAX Bot API: ${maxMe.error || maxMe.description || 'Unknown error'}`);
        exitCode = 1;
      } else {
        console.log(`   Bot: ${maxMe.name || maxMe.username || '(connected)'}`);

        if (!MAX_SECRET) {
          console.log('   ⚠️  MAX_WEBHOOK_SECRET not set — webhook will be unauthenticated!');
        }

        if (!DRY_RUN) {
          console.log('   Registering webhook...');
          const result = await maxSetWebhook();
          if (result.ok) {
            console.log(`   ✅ Webhook registered: ${BASE_URL}/api/max/webhook`);
          } else {
            console.log(`   ⚠️  Registration may have failed — check MAX Developer portal`);
            console.log(`      Response: ${JSON.stringify(result)}`);
          }

          // Verify
          const verify = await maxGetWebhookInfo();
          if (verify.ok) {
            console.log(`   🔍 Current webhook URL: ${verify.url || '(not set)'}`);
          }
        } else {
          console.log(`   [DRY RUN] Would register: ${BASE_URL}/api/max/webhook`);
        }
      }
    }
    console.log('');
  }
}

async function main() {
  if (CHECK_ONLY) {
    await checkAll();
  } else {
    await checkAll();
    console.log('─'.repeat(60));
    await registerAll();
  }

  console.log('═'.repeat(60));
  console.log(exitCode === 0 ? '✅ All done!' : '❌ Completed with errors — see above');
  console.log('═'.repeat(60));
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
