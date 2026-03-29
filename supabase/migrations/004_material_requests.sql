-- ── 004: Таблица заявок на материалы ──────────────────────────────────────
-- Применить: Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS material_requests (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Отключаем RLS — вставка только через service_role с сервера
ALTER TABLE material_requests DISABLE ROW LEVEL SECURITY;
