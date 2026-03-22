#!/usr/bin/env python3
"""
Ежедневные cron-задачи Подряд PRO:
1. Отмена зависших pending-заказов (>24ч без оплаты)
2. Снятие VIP-статуса с истекших подписок
3. Деактивация неактивных push-подписок (>90 дней)
4. Проверка подключения к Supabase

Ожидаемые переменные окружения:
  SUPABASE_URL — https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY — секрет service_role из Supabase Dashboard
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone


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

    # 1. Проверка подключения
    try:
        res = client.table("rates").select("id").limit(1).execute()
        n = len(res.data or [])
        print(f"Supabase OK: подключение работает (rates: {n} строк)")
    except Exception as e:
        print(f"Ошибка подключения к Supabase: {e}", file=sys.stderr)
        sys.exit(1)

    now = datetime.now(timezone.utc)

    # 2. Отмена зависших pending-заказов (>24ч)
    cutoff_24h = (now - timedelta(hours=24)).isoformat()
    try:
        res = (
            client.table("orders")
            .update({"status": "cancelled"})
            .eq("status", "pending")
            .lt("created_at", cutoff_24h)
            .execute()
        )
        cancelled = len(res.data or [])
        if cancelled > 0:
            print(f"Отменено зависших заказов (>24ч): {cancelled}")
        else:
            print("Зависших pending-заказов нет")
    except Exception as e:
        print(f"Ошибка отмены заказов: {e}", file=sys.stderr)

    # 3. Снятие VIP-статуса с истекших подписок
    now_iso = now.isoformat()
    try:
        res = (
            client.table("workers")
            .update({"is_vip": False, "vip_expires_at": None})
            .eq("is_vip", True)
            .lt("vip_expires_at", now_iso)
            .execute()
        )
        expired_vip = len(res.data or [])
        if expired_vip > 0:
            print(f"Снят VIP-статус (истёк): {expired_vip}")
        else:
            print("Истекших VIP-подписок нет")
    except Exception as e:
        print(f"Ошибка снятия VIP: {e}", file=sys.stderr)

    # 4. Деактивация старых push-подписок (>90 дней)
    cutoff_90d = (now - timedelta(days=90)).isoformat()
    try:
        res = (
            client.table("push_subscriptions")
            .update({"is_active": False})
            .eq("is_active", True)
            .lt("created_at", cutoff_90d)
            .execute()
        )
        deactivated = len(res.data or [])
        if deactivated > 0:
            print(f"Деактивировано старых push-подписок: {deactivated}")
        else:
            print("Старых push-подписок нет")
    except Exception as e:
        print(f"Ошибка деактивации push: {e}", file=sys.stderr)

    print("Cron-задачи завершены успешно")
    sys.exit(0)


if __name__ == "__main__":
    main()
