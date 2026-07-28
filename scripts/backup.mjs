#!/usr/bin/env node

/**
 * Подряд PRO — Backup Script
 *
 * Creates:
 *  1. Supabase database dump (pg_dump via connection string)
 *  2. Tar archive of critical configs (nginx, docker-compose, n8n workflows)
 *
 * Usage:
 *   node scripts/backup.mjs                           # full backup
 *   node scripts/backup.mjs --db-only                 # database only
 *   node scripts/backup.mjs --configs-only            # configs only
 *   node scripts/backup.mjs --retention 14            # keep 14 days (default: 7)
 *
 * Requires env vars (from .env.local or environment):
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service_role key
 *   NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
 *
 * Cron example (VPS crontab — runs daily at 03:00 MSK):
 *   0 3 * * * cd /root/podryad-pro && node scripts/backup.mjs >> /var/log/podryad-backup.log 2>&1
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const BACKUP_DIR = join(PROJECT_ROOT, 'backups');

// ── CLI args ──
const args = process.argv.slice(2);
const DB_ONLY = args.includes('--db-only');
const CONFIGS_ONLY = args.includes('--configs-only');
const RETENTION_DAYS = (() => {
  const idx = args.indexOf('--retention');
  return idx !== -1 ? parseInt(args[idx + 1], 10) || 7 : 7;
})();

// ── Timestamp ──
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function run(cmd, options = {}) {
  log(`  RUN: ${cmd}`);
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...options });
}

// ── Ensure backup dir ──
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  log(`Created backup directory: ${BACKUP_DIR}`);
}

// ═══════════════════════════════════════════════════════════════
// 1. DATABASE DUMP (Supabase pg_dump)
// ═══════════════════════════════════════════════════════════════

async function backupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    log('SKIP: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    log('  Source these from .env.local before running.');
    return false;
  }

  // Extract project ref from URL: https://xxxxxxxxxxxx.supabase.co → xxxxxxxxxxxx
  const urlMatch = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/);
  if (!urlMatch) {
    log(`ERROR: Cannot parse Supabase URL: ${supabaseUrl}`);
    return false;
  }
  const projectRef = urlMatch[1];

  const dbHost = `db.${projectRef}.supabase.co`;
  const dbUrl = `postgresql://postgres:${serviceRoleKey}@${dbHost}:5432/postgres`;

  const dumpFile = join(BACKUP_DIR, `db_dump_${stamp}.sql`);
  const compressedFile = `${dumpFile}.gz`;

  try {
    log(`Dumping database from ${dbHost}...`);
    run(`pg_dump "${dbUrl}" --no-owner --no-acl --clean --if-exists > "${dumpFile}"`, { shell: true });

    const size = (statSync(dumpFile).size / (1024 * 1024)).toFixed(2);
    log(`  Dump saved: ${dumpFile} (${size} MB)`);

    // Compress
    run(`gzip -f "${dumpFile}"`);
    const compressedSize = (statSync(compressedFile).size / (1024 * 1024)).toFixed(2);
    log(`  Compressed: ${compressedFile} (${compressedSize} MB)`);

    return true;
  } catch (err) {
    const msg = err.stderr || err.message || String(err);
    log(`ERROR: Database dump failed: ${msg}`);
    // Clean up uncompressed file if it exists
    try { if (existsSync(dumpFile)) unlinkSync(dumpFile); } catch {}
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. CONFIGS ARCHIVE
// ═══════════════════════════════════════════════════════════════

function backupConfigs() {
  const configPaths = [
    'docker/nginx.conf',
    'docker-compose.yml',
    '.env.example',
    'pwa/.env.example',
    'pwa/vercel.json',
    'pwa/package.json',
    'pwa/tailwind.config.js',
    'pwa/tsconfig.json',
    'supabase/config.toml',
    'n8n/workflows/',
    '.github/workflows/ci.yml',
  ];

  const archiveFile = join(BACKUP_DIR, `configs_${stamp}.tar.gz`);

  // Build list of existing files
  const existing = [];
  for (const p of configPaths) {
    const full = join(PROJECT_ROOT, p);
    if (existsSync(full)) {
      existing.push(p);
    } else {
      log(`  SKIP (not found): ${p}`);
    }
  }

  if (existing.length === 0) {
    log('No config files found to archive.');
    return false;
  }

  try {
    const fileList = existing.map(p => `"${p}"`).join(' ');
    run(`tar -czf "${archiveFile}" -C "${PROJECT_ROOT}" ${fileList}`, { shell: true });

    const size = (statSync(archiveFile).size / 1024).toFixed(1);
    log(`  Configs archived: ${archiveFile} (${size} KB, ${existing.length} entries)`);
    return true;
  } catch (err) {
    log(`ERROR: Config archive failed: ${err.message || String(err)}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. ROTATION — remove backups older than RETENTION_DAYS
// ═══════════════════════════════════════════════════════════════

function rotateBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;

  try {
    const files = readdirSync(BACKUP_DIR);
    for (const f of files) {
      const full = join(BACKUP_DIR, f);
      try {
        const st = statSync(full);
        if (st.mtimeMs < cutoff) {
          unlinkSync(full);
          removed++;
          log(`  ROTATED: ${f}`);
        }
      } catch {}
    }
  } catch (err) {
    log(`Rotation scan error: ${err.message || String(err)}`);
  }

  if (removed > 0) {
    log(`  Rotation: removed ${removed} old backup(s), keeping ${RETENTION_DAYS} days`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  log(`=== Подряд PRO Backup ===`);
  log(`Timestamp: ${stamp}`);
  log(`Backup dir: ${BACKUP_DIR}`);
  log(`Retention: ${RETENTION_DAYS} days`);

  let dbOk = false;
  let configsOk = false;

  if (!CONFIGS_ONLY) {
    log('--- Database dump ---');
    dbOk = await backupDatabase();
  }

  if (!DB_ONLY) {
    log('--- Configs archive ---');
    configsOk = backupConfigs();
  }

  log('--- Rotation ---');
  rotateBackups();

  log('');
  if ((DB_ONLY && dbOk) || (CONFIGS_ONLY && configsOk) || (dbOk && configsOk)) {
    log('✅ Backup completed successfully');
  } else {
    log('⚠️  Backup completed with warnings (check logs above)');
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message || String(err)}`);
  process.exit(1);
});
