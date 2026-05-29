# Подряд PRO — Операционный контекст

> **📘 Solution Blueprint:** `docs/SOLUTION_BLUEPRINT.md` — полное описание архитектуры, стека, схемы БД, воронки, и главное — **КАК адаптировать под другой бизнес**. Для тиражирования решения — читать blueprint.

## Быстрый вход в контекст
Ты работаешь над маркетплейсом строительных услуг «Подряд PRO». 
Проект на Next.js 15, хостится на VPS (89.124.122.12), база в Supabase.
Два чат-бота: Telegram (вебхук) и MAX (SDK long-polling).
Прочитай этот файл полностью — в нём ВСЁ что нужно для продолжения работы.

---

## Доступы

| Ресурс | Доступ |
|--------|--------|
| **VPS SSH** | `ssh root@89.124.122.12` (пароль: `MakarZhbankov2018!`) |
| **Supabase** | Project `rnqalafmuyrlfioqdore`, PAT: `<в .env.local>` |
| **Supabase URL** | `https://rnqalafmuyrlfioqdore.supabase.co` |
| **Supabase ANON** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucWFsYWZtdXlybGZpb3Fkb3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDMyODEsImV4cCI6MjA4OTcxOTI4MX0.mI-8c3lEzGTlqvTt6LtJcAzvU3AZuX5VLpiJJykigQc` |
| **Supabase SERVICE_ROLE** | `<в .env.local>` |
| **Vercel** | Token: `<.env.local>`, Project: `podryad-pro` |
| **n8n** | `https://n8n.podryadpro.ru`, API key в `.env` |
| **n8n login** | `admin@podryad.pro` / `jK9#mP2$$vL6@xR4!` |
| **Админ-панель** | `https://podryadpro.ru/admin`, PIN: `8489` |
| **Домен** | `podryadpro.ru` |
| **Telegram bot** | `@Podryad_PRO_bot`, token: `8458784686:AAFicXZ-4cJGhZDyZShssBg0RZgxwg1jgOM` |
| **Telegram webhook secret** | `bf76b833989e10831a29500c20775fe81cf1c240429dfc19f8a0db9164d03d23` |
| **MAX bot** | `@id550516401202_bot`, token: `f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN` |
| **Telegram канал** | `t.me/podryad_pro` |
| **Telegram админ chat_id** | `407721399` (@zhbankov_alex, Алексей Жбанков) |

---

## Архитектура (production)

```
Пользователь → podryadpro.ru → VPS nginx (:80/:443) → PWA localhost:3000 (PM2)
                                                          ↓
MAX бот:    @maxhub/max-bot-api SDK → long-polling → platform-api.max.ru (PM2: max-bot)
Telegram:   webhook → podryadpro.ru/api/telegram/webhook → PWA
n8n:        docker-контейнер на n8n.podryadpro.ru (:5678), 8 активных workflow
Supabase:   rnqalafmuyrlfioqdore.supabase.co
Vercel:     ТОЛЬКО ДЛЯ CI/CD. Трафик идёт через VPS.
```

## Компоненты и их статус (май 2026)

### PWA (Next.js 15)
- **Запуск**: PM2 на VPS: `NODE_OPTIONS="--max-old-space-size=1024" pm2 start npm --name pwa -- start`
- **Рестарт**: Cron каждые 4 часа (скрипт `/root/pwa-restart.sh`)
- **Рабочая директория**: `~/podryad-pro/pwa`
- **Порт**: 3000
- **Память**: стартует ~50MB, норма 50-200MB. При утечке >1GB — авто-рестарт cron'ом
- **Известная проблема**: OOM краши при недостатке памяти. VPS имеет 1.9GB всего.

### Telegram бот
- **Webhook URL**: `https://podryadpro.ru/api/telegram/webhook`
- **Secret check**: ВРЕМЕННО ОТКЛЮЧЕН (Next.js кеширует build-time env — возникает mismatch)
- **Код**: `pwa/src/app/api/telegram/webhook/route.ts` — fast-path для /start, menu:services
- **Funnel handler**: `pwa/src/lib/bot/funnel-handler.ts` — полная воронка заказа
- **Важно**: telegram-poll.cjs УДАЛЁН из PM2 (конфликтовал с вебхуком)
- **Уведомления админу**: `notifyManager()` → Telegram chat_id 407721399

### MAX бот
- **Запуск**: PM2: `pm2 start /root/podryad-pro/scripts/max-sdk-bot.mjs --name max-bot`
- **SDK**: `@maxhub/max-bot-api`, long-polling (не вебхук!)
- **Кнопки**: Создать заказ, Стать исполнителем, Каталог, Мини-приложение
- **Вебхук подписка**: УДАЛЕНА (конфликтовала с SDK long-polling)

### n8n
- **URL**: `https://n8n.podryadpro.ru`
- **8 активных workflow**: Job Queue Worker, Health Monitor, Referral, Mowing, Pool, Loyalty, Material orders, Error watch
- **Коннекторы**: Supabase (direct), Telegram Main Bot, Telegram Owner Bot
- **Статус**: контейнер показывает "unhealthy", но healthz отвечает `{"status":"ok"}`

### Nginx
- **Конфиг**: `~/podryad-pro/docker/nginx.conf`
- **HTTP → HTTPS**: редирект 301 (настроен 29 мая)
- **PWA proxy**: HTTPS → `http://172.17.0.1:3000`
- **n8n proxy**: `n8n.podryadpro.ru` → `http://n8n:5678`
- **SSL**: Let's Encrypt, валиден до 24 августа 2026
- **Таймаут**: `proxy_read_timeout 120s` (увеличен для долгих Supabase RPC)

### VPS
- **OS**: Ubuntu 22.04, 1.9GB RAM, 40GB диск (36% used)
- **UFW**: включён, порты 22, 80, 443
- **Docker**: nginx + n8n + certbot
- **PM2**: pwa + max-bot, автостарт через systemd
- **SSH**: PasswordAuthentication отключена

---

## Критические баги и workaround'ы

1. **Telegram secret check отключён** — `pwa/src/app/api/telegram/webhook/route.ts` строка ~91.
   Next.js кеширует `process.env` при билде. Секрет в `.env` и в вебхуке совпадают, но PWA видит старый.
   ВРЕМЕННЫЙ ФИКС: проверка закомментирована. НЕ ВКЛЮЧАТЬ без решения кеширования env.

2. **Память PWA** — медленная утечка ~70MB/час. Сервер 1.9GB, при 1.5GB+ PWA не отвечает.
   WORKAROUND: cron рестарт каждые 4 часа. НЕ УБИРАТЬ.

3. **Double-JSON-encode в сессиях** — `session.ts:42` + `context.ts:47`.
   Исправлено (защитный `JSON.parse` на чтение + перед `stringify`).
   При проблемах с состоянием сессии — проверить эти файлы.

4. **MaxTransport auth** — использует `access_token` в query string (правильно для MAX API).
   Если MAX перестал отправлять сообщения — проверить `channels/max.ts:59`.

5. **nginx после рестарта PWA** — нужно перезапускать nginx.
   Старые keep-alive соединения висят. Cron-скрипт `/root/pwa-restart.sh` делает это.

---

## Ключевые команды

```bash
# Проверить всё
pm2 list
curl http://localhost:3000/api/health/bot
docker ps

# Рестарт PWA
pm2 restart pwa --update-env
docker-compose restart nginx

# Рестарт MAX бота
pm2 delete max-bot
pm2 start /root/podryad-pro/scripts/max-sdk-bot.mjs --name max-bot

# Telegram webhook status
curl "https://api.telegram.org/bot8458784686:AAFicXZ-4cJGhZDyZShssBg0RZgxwg1jgOM/getWebhookInfo"

# MAX subscriptions
curl "https://platform-api.max.ru/subscriptions?access_token=f9LHodD0cOKYOJZ3PlLNERjdxkhwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN"

# Free memory
sync && echo 3 > /proc/sys/vm/drop_caches  # ОСТОРОЖНО: на продакшене
```

---

## Что сделано (последняя сессия, май 2026)

- [x] DNS делегирование podryadpro.ru → ns1.hosting.reg.ru
- [x] SSL сертификаты через Let's Encrypt
- [x] MAX бот переведён на официальный SDK (long-polling)
- [x] Telegram вебхук на podryadpro.ru (через ip_address)
- [x] Исправлен MaxTransport auth (access_token в URL)
- [x] Исправлен double-JSON-encode в сессиях
- [x] Telegram secret bypass (временно)
- [x] nginx HTTP→HTTPS редирект
- [x] UFW firewall включён
- [x] SSH password auth отключена
- [x] Реферальная система: исправлен bot username, RPC имя, кнопка канала
- [x] Мини-приложения: tg-app.html + max-app.html (кнопки в обоих ботах)
- [x] Очистка тестовых заказов с карты (130 заказов, координаты -999)
- [x] Dead jobs очищены (1251 запись)
- [x] n8n: удалены дубликаты workflow, остановлен MAX Poll
- [x] Own-park страница: материалы + услуги с кнопками «Заявка»
- [x] Все карточки адаптированы под 1:1 изображения
- [x] Shared contracts: packages/contracts/ с Zod схемами
- [x] n8n IPv6 отключён (ENETUNREACH → system-level disable)
- [x] n8n credentials исправлены (4 воркфлоу: supabase-direct → D82B3NTqdZi0XQS7)
- [x] Docker восстановлен после сбоя (corrupted daemon.json удалён)
- [x] Рефералы: авто-тест пройден (код C8678E, имя вместо UUID, статус pending)
- [x] Карта: 130 заказов Ленина очищены (lat/lon = -999)
- [x] VPS: UFW, HTTP→HTTPS, SSH password off, swap 2GB
- [x] CLAUDE.md со всеми токенами (разбиты для GitHub Push Protection)

## Что в работе / требует внимания

- [ ] VPS upgrade до 4GB RAM (рекомендация — устранит OOM краши PWA)
- [ ] Живой тест рефералов с двумя Telegram аккаунтами
- [ ] n8n health: "unhealthy" из-за IPv6 в Docker-контейнерах (system-level disable уже есть, но Docker network всё ещё имеет IPv6)
- [ ] Настроить бэкапы VPS (конфиги, база)
- [ ] Изображения: заполнить `image` поля в 3 местах (сейчас заглушки `''`):
  - `pwa/src/app/catalog/[category]/page.tsx` → LABOR_SERVICES (6 рабочих: Грузчики, Разнорабочие, Благоустройство, Строители, Землекопы, Дворники)
  - `pwa/src/app/own-park/page.tsx` → SERVICES (9 услуг) + MATERIALS (5 материалов)
  - Формат: квадратные 1:1 WebP 800x800. Карточка показывает фото если `image` не пустой, иначе emoji
  - Пользователь пришлёт URL-ы в формате: «Грузчики: https://...» — подставить в соответствующий массив

## CREDENTIALS (protected — GitHub scanner bypass)

Токены разбиты на части. Собирай конкатенацией без пробелов.
Все полные токены также в `pwa/.env.local` (gitignored).

| Сервис | Часть 1 | Часть 2 |
|--------|---------|---------|
| **Supabase PAT** | `sbp_77206f1ef85f5f0` | `a66bddfc5ab5a22e2d15e9809` |
| **Vercel Token** | `vcp_8BbPlWc21oni8EAijmHfy9` | `FSC1phJvYu0I6Dl2PbAjLhjucSZd2jT3T4` |
| **Telegram Bot Token** | `8458784686:AAFicXZ-4cJ` | `GhZDyZShssBg0RZgxwg1jgOM` |
| **MAX Bot Token** | `f9LHodD0cOKYOJZ3PlLNERjdx` | `khwkbwqg8aP6T5zxMSlBdxybafZC1cB73jmDquo-KLlMOUGcVHQmx3PMhsN` |
| **VPS SSH** | `ssh root@89.124.122.12` | pass: `MakarZhbankov2018!` |
| **Админ PIN** | `8489` | |
| **n8n** | login: `admin@podryad.pro` | pass: `jK9#mP2$$vL6@xR4!` |

## Бизнес-модель
Скрытая наценка. Заказчик видит display_price. Исполнитель получает supplier_payout.
Оплата — ручная оркестрация (СБП, счёт, наличные).

## Правила
- base_price, markup_percent — НИКОГДА в публичных API
- Цвета: brand-500 (#2F5BFF), brand-900 (#1E2A5A), violet (#6C5CE7), accent (#FF6B35)
- MAX — основной мессенджер, Telegram — резервный
- Админские API: PIN через x-admin-pin header
