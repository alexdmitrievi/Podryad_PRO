import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { request } from 'https';

const TOKEN = process.env.SUPABASE_PAT;
const PROJECT_REF = process.env.SUPABASE_REF;

if (!TOKEN || !PROJECT_REF) {
  console.error('Missing SUPABASE_PAT or SUPABASE_REF env vars');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const migrationsDir = join(rootDir, 'supabase', 'migrations');

// schema.sql first (001 is just \i ../schema.sql pointer), then 002..016, skip 001
const migrationFiles = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && !f.startsWith('001_'))
  .sort();

// Build ordered list: schema.sql first, then migrations
const files = [
  { label: 'schema.sql (base schema)', path: join(rootDir, 'supabase', 'schema.sql') },
  ...migrationFiles.map(f => ({ label: f, path: join(migrationsDir, f) })),
];

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(JSON.stringify(parsed).substring(0, 400)));
          }
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 400)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`Project ref: ${PROJECT_REF}`);
  console.log(`Total steps: ${files.length}\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const sql = readFileSync(file.path, 'utf8');

    process.stdout.write(`[${String(ok + failed + 1).padStart(2, '0')}] ${file.label} ... `);
    try {
      await runQuery(sql);
      console.log('✓ OK');
      ok++;
    } catch (err) {
      console.log('✗ FAILED');
      console.error(`     ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────`);
  console.log(`Done: ${ok} OK, ${failed} failed`);
  if (failed > 0) {
    console.log('Failed migrations may already be applied (IF NOT EXISTS guards). Check errors above.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
