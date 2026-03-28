-- Migration 003: Добавить email и поля бизнес-субъекта в таблицу users
-- Регистрация собирает email, entity_type, company_name, inn,
-- но эти колонки отсутствовали в исходной схеме.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'person'
  CHECK (entity_type IN ('person', 'selfemployed', 'ip', 'company'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS inn TEXT NOT NULL DEFAULT '';

-- Уникальный частичный индекс: предотвращает дубли email, разрешает множественные NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(lower(email)) WHERE email IS NOT NULL;
