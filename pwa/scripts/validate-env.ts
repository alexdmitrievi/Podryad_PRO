import { readFileSync } from 'fs';
import { resolve } from 'path';

const CRITICAL_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SESSION_SECRET',
  'ADMIN_PIN',
  'CUSTOMER_JWT_SECRET',
  'CRON_SECRET',
];

const IMPORTANT_VARS = [
  'TELEGRAM_BOT_TOKEN',
  'MAX_BOT_TOKEN',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_APP_URL',
];

function parseEnvExample(path: string): string[] {
  const content = readFileSync(path, 'utf-8');
  const vars: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars.push(trimmed.slice(0, eqIdx));
  }
  return vars;
}

function main() {
  const examplePath = resolve(__dirname, '..', '.env.example');
  const allVars = parseEnvExample(examplePath);

  const missingCritical: string[] = [];
  const missingImportant: string[] = [];
  const missingOptional: string[] = [];

  for (const v of allVars) {
    if (process.env[v]) continue;

    if (CRITICAL_VARS.includes(v)) {
      missingCritical.push(v);
    } else if (IMPORTANT_VARS.includes(v)) {
      missingImportant.push(v);
    } else {
      missingOptional.push(v);
    }
  }

  console.log(`\nEnv validation: checking ${allVars.length} variables from .env.example\n`);

  if (missingCritical.length > 0) {
    console.log(`❌ CRITICAL — missing (${missingCritical.length}):`);
    for (const v of missingCritical) console.log(`   - ${v}`);
  } else {
    console.log('✅ All critical variables are present');
  }

  if (missingImportant.length > 0) {
    console.log(`\n⚠️  IMPORTANT — missing (${missingImportant.length}):`);
    for (const v of missingImportant) console.log(`   - ${v}`);
  } else {
    console.log('\n✅ All important variables are present');
  }

  if (missingOptional.length > 0) {
    console.log(`\nℹ️  OPTIONAL — missing (${missingOptional.length}):`);
    for (const v of missingOptional) console.log(`   - ${v}`);
  } else {
    console.log('\n✅ All optional variables are present');
  }

  console.log('');

  if (missingCritical.length > 0) {
    console.log('❌ Validation FAILED — critical variables are missing');
    process.exit(1);
  }

  console.log('✅ Validation PASSED');
  process.exit(0);
}

main();
