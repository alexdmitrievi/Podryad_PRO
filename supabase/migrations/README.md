# Миграции БД

Миграции пронумерованы и применяются последовательно.

## Применение

```bash
# Через Supabase CLI (рекомендуется)
supabase db push

# Или вручную через SQL Editor
# Скопируйте содержимое файла миграции и выполните в Supabase Dashboard → SQL Editor
```

## Создание новой миграции

```bash
# Формат: NNN_описание.sql
touch supabase/migrations/003_add_feature.sql
```

## История

| # | Описание | Дата |
|---|----------|------|
| 001 | Полная начальная схема (8 таблиц + RLS + seed) | 2026-03-22 |
| 002 | Поля city и about для профиля воркера | 2026-03-23 |
| 003 | Email + поля бизнес-субъекта для таблицы users | 2026-03-27 |
| 013_crm_agent | CRM-воронка, crm_messages, crm_executor_prospects | 2026-04-10 |
| 013_executor_responses | Таблица executor_responses (несмотря на совпадение префикса с 013_crm_agent, применяется после него — alphabetical order) | 2026-04-10 |
| 020 | Расширение CHECK orders.status (добавлены priced, payment_sent, in_progress, completed) | 2026-04-19 |
| 021 | Недостающие индексы: customer_tokens.phone, composite (stage, next_followup_at) для CRM, (status, created_at DESC) для orders, partial для WF-07 | 2026-04-19 |
