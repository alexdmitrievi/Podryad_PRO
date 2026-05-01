# Статусная машина заказа (Order Lifecycle)

## Диаграмма состояний

```
                    ┌──────────────┐
          ┌─────────│  cancelled   │ (отмена админом или заказчиком)
          ▼         └──────────────┘
     ┌─────────┐
     │ pending │  ← заказ создан (POST /api/orders или /api/orders/create)
     └────┬────┘
          │  Админ оценивает заказ → проставляет цену
          ▼
     ┌─────────┐
     │ priced  │  ← display_price установлена, markup рассчитан
     └────┬────┘
          │  Админ отправляет счёт (POST /api/admin/orders/:id/send-invoice)
          ▼
     ┌──────────────┐
     │ payment_sent │  ← заказчику ушла ссылка на оплату (СБП/счёт)
     └──────┬───────┘
            │  Заказчик оплатил → админ подтверждает (PUT /api/admin/orders/:id/payment-status)
            ▼
     ┌─────────┐
     │  paid   │  ← платёж получен, заказ готов к выполнению
     └────┬────┘
          │  Исполнитель взят в работу (админ назначает executor_id)
          ▼
     ┌────────────┐
     │ in_progress│  ← работа выполняется
     └─────┬──────┘
           │  Обе стороны подтверждают (POST /api/orders/:id/confirm)
           ▼
     ┌────────────┐
     │ confirming │  ← ожидание выплаты исполнителю
     └─────┬──────┘
           │  Админ выплачивает (PUT /api/admin/orders/:id/payment-status)
           ▼
     ┌───────────┐      ┌──────────────┐
     │ completed │      │  published   │  ← заказ опубликован в ленте (для исполнителей)
     └───────────┘      └──────────────┘
                              ↑
                         (отдельный флоу: заказ без заказчика в ленте)


     ┌───────────┐
     │ disputed  │  ← спор открыт (POST /api/orders/:id/dispute)
     └─────┬─────┘
           │  Админ решает спор (PATCH /api/orders/:id/dispute)
           ├──────────→ completed (спор решён в пользу завершения)
           └──────────→ cancelled  (спор решён в пользу отмены)
```

## Триггеры переходов

| Из | В | Кто | Действие |
|----|----|-----|---------|
| `pending` | `priced` | Admin | Оценка стоимости, установка display_price |
| `pending` | `cancelled` | Admin / Заказчик | Отмена до начала работ |
| `priced` | `payment_sent` | Admin | Отправка счёта/ссылки заказчику |
| `payment_sent` | `paid` | Admin | Подтверждение получения платежа |
| `paid` | `in_progress` | Admin | Назначение исполнителя |
| `in_progress` | `confirming` | Обе стороны | Подтверждение выполнения через PWA |
| `in_progress` | `disputed` | Любая сторона | Открытие спора |
| `confirming` | `completed` | Admin | Выплата исполнителю |
| `disputed` | `completed` | Admin | Решение спора (в пользу завершения) |
| `disputed` | `cancelled` | Admin | Решение спора (в пользу отмены) |
| * | `closed` | Admin | Архивация заказа |
| * | `published` | Admin | Публикация в ленте (без заказчика) |

## Особые статусы

| Статус | Описание |
|--------|----------|
| `published` | Заказ без заказчика в ленте для исполнителей (публичная лента) |
| `closed` | Архивный заказ, не отображается никому кроме админа |
| `done` | Устаревший алиас `completed` (поддерживается для обратной совместимости) |
| `cancelled` | Отменённый заказ (до выполнения работ) |

## Флоу заказчика (customer PWA)

```
Лендинг → Форма заявки → POST /api/orders → pending
                                               ↓
                    POST /api/my/recover → Ссылка на dashboard
                                               ↓
                    /my/:token → Видит статус + цену (display_price)
                                               ↓
                    Оплачивает вручную (СБП) → пишет админу
                                               ↓
                    /order/:id/confirm → Подтверждает выполнение
```

## Флоу исполнителя (executor)

```
/dashboard → Видит ленту published-заказов на карте
                ↓
POST /api/orders/respond → Отклик на заказ
                ↓
Админ назначает → in_progress
                ↓
/order/:id/confirm → Подтверждает выполнение
                ↓
Админ выплачивает → completed
```

## API эндпоинты статусной машины

| Метод | Эндпоинт | Меняет статус |
|-------|----------|---------------|
| POST | `/api/orders` | → `pending` |
| POST | `/api/orders/create` | → `pending` |
| PUT | `/api/admin/orders/:id` | Любой → любой (админ) |
| POST | `/api/admin/orders/:id/send-invoice` | → `payment_sent` |
| PUT | `/api/admin/orders/:id/payment-status` | `payment_sent` → `paid` / `confirming` → `completed` |
| POST | `/api/orders/:id/confirm` | `in_progress` → `confirming` |
| POST | `/api/orders/:id/dispute` | `in_progress` → `disputed` |
| PATCH | `/api/orders/:id/dispute` | `disputed` → `completed` / `cancelled` |
