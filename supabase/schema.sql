-- Push-уведомления PWA (подписки Web Push)
-- Выполнить в Supabase SQL Editor, если таблицы ещё нет.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_phone ON push_subscriptions(phone);
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON push_subscriptions(role);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Realtime для дашборда (клиент слушает postgres_changes на `orders`):
-- Dashboard → Database → Publications → supabase_realtime → включить таблицу `orders`, если ещё не в списке.
