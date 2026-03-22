#!/usr/bin/env python3
"""
Проверка доступа к Supabase (service role) и точка расширения для cron-задач
(обновление статусов тендеров, фоновые отчёты и т.д.).

Ожидаемые переменные окружения:
  SUPABASE_URL — https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY — секрет service_role из Supabase Dashboard
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print(
            "Ошибка: задайте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
            file=sys.stderr,
        )
        sys.exit(1)

    from supabase import create_client

    client = create_client(url, key)

    # Лёгкая проверка: таблица rates есть в базовой схеме (сид)
    try:
        res = client.table("rates").select("id").limit(1).execute()
        n = len(res.data or [])
        print(f"Supabase OK: подключение к БД работает (rates, строк: {n})")
    except Exception as e:
        print(f"Ошибка запроса к Supabase: {e}", file=sys.stderr)
        sys.exit(1)

    # TODO: при необходимости — обновление статусов тендеров, синхронизация и т.д.
    sys.exit(0)


if __name__ == "__main__":
    main()
