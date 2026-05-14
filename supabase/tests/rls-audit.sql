-- RLS Audit Script
-- Run this against your Supabase project to verify RLS is properly configured
-- Usage: psql <connection-string> -f rls-audit.sql

-- 1. List all tables with RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. List all policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check for tables WITHOUT RLS (potential data leak)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '_prisma%'
  AND tablename NOT LIKE 'supabase_%'
ORDER BY tablename;

-- 4. Check for tables without any policies
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- 5. Verify job_queue has proper RLS
SELECT 'job_queue RLS check' as check_name,
  CASE WHEN rowsecurity THEN 'PASS' ELSE 'FAIL' END as result
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'job_queue';
