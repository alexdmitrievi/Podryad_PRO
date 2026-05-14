-- Migration Validation Script
-- Checks integrity of the migrations table

-- 1. Count migrations
SELECT count(*) as total_migrations FROM supabase_migrations.schema_migrations;

-- 2. List all migrations in order
SELECT version, name, statements,
       to_char(executed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- 3. Check for gaps in migration sequence
WITH numbered AS (
  SELECT version, ROW_NUMBER() OVER (ORDER BY version) as rn
  FROM supabase_migrations.schema_migrations
)
SELECT 'Gap after migration ' || prev.version as issue
FROM numbered prev
LEFT JOIN numbered curr ON curr.rn = prev.rn + 1
WHERE curr.version IS NULL;

-- 4. Verify all core tables exist
SELECT 'orders table' as check_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') as exists;
SELECT 'job_queue table' as check_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_queue') as exists;
SELECT 'leads table' as check_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') as exists;
