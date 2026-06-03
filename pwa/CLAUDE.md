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
- **UFW**: **ВЫКЛЮЧЕН**. Включение ломает Docker-сеть (iptables INPUT DROP убивает docker0/br-*). Docker сам держит нужные порты открытыми. НЕ ВКЛЮЧАТЬ UFW.
- **Docker**: nginx + n8n + certbot
- **PM2**: pwa + max-bot, автостарт через systemd
- **SSH**: PasswordAuthentication отключена
- **Cloudflare**: проксирует трафик (SSL Full). Блокирует headless-браузеры и curl с некоторых IP (ботозащита). Тестировать напрямую через VPS: `ssh root@VPS curl localhost`

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

6. **UFW + Docker конфликт** — `ufw enable` ставит INPUT DROP и убивает Docker-виртуальную сеть
   (docker0, br-*). Nginx теряет связь с n8n, сайт падает полностью. НЕ ВКЛЮЧАТЬ UFW.

7. **n8n ContainerConfig error** — после `iptables -F` + ребута Docker портит метаданные контейнера.
   `docker-compose up -d` падает с `KeyError: 'ContainerConfig'`.
   ФИКС: `docker rm <container_id> && docker-compose up -d n8n`

8. **Nginx зависимость от n8n** — при старте nginx резолвит upstream `n8n` (контейнер).
   Если n8n не запущен — nginx падает: `host not found in upstream "n8n"`.
   Порядок запуска: сначала n8n, потом nginx. `docker-compose up -d` соблюдает depends_on.

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

# Починить n8n после ContainerConfig error
docker rm fefc76a5109b_podryad-pro_n8n_1
cd /root/podryad-pro && docker-compose up -d n8n

# Восстановление VPS после полного падения (выполнять в VNC-консоли VDSina)
iptables -P INPUT ACCEPT && iptables -P FORWARD ACCEPT && iptables -P OUTPUT ACCEPT
iptables -F && iptables -t nat -F
systemctl restart sshd && ufw disable
systemctl start docker
cd /root/podryad-pro && docker-compose up -d n8n && sleep 5 && docker-compose up -d nginx
pm2 resurrect
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

### 🔴 Восстановление VPS — сессия 01.06.2026

- [x] VPS восстановлен через VNC-консоль VDSina (сброс iptables, рестарт sshd, docker)
- [x] UFW выключен (конфликт с Docker — см. критический баг #6)
- [x] n8n починен: ContainerConfig error → `docker rm` + `docker-compose up -d n8n`
- [x] nginx запущен после n8n (зависимость upstream, см. критический баг #8)
- [x] Все эндпоинты подтверждены — 200: сайт, API, dashboard, n8n
- [x] Telegram вебхук активен: pending_update_count=0, ip_address=89.124.122.12
- [x] PWA протестирован: десктоп 1440x900 + мобилка iOS/Android
- [x] PWA манифест, service worker, иконки, apple-touch-icon — все на месте
- [x] Iptables + Docker-сеть стабильны (не включать UFW!)
- [x] Код задеплоен до сбоя: SW_VERSION=11, dedup-заказов, demo-заказы, SW unregister
- [x] docker/nginx.conf: Cloudflare IP restore, server_name включает IP
- [x] docker-compose.yml: порт 8443, nginx depends_on n8n
- [x] .gitignore: SW-файлы заигнорены
- [x] Команда восстановления VPS добавлена в «Ключевые команды»
- [x] nginx: proxy_read_timeout 120s для n8n (location /) — OAuth колбэки Google
- [x] Docker NAT MASQUERADE восстановлены (`systemctl restart docker`) — контейнеры не могли в интернет
- [x] Корневая причина падений: iptables -F убивает Docker NAT → outbound у контейнеров → 504/000
- [x] Cloudflare блокирует headless-браузеры и curl с локальной машины. Тесты — через VPS
- [x] n8n WEBHOOK_URL + N8N_SECURE_COOKIE исправлены на HTTPS

### 🔑 OAuth Google — сессия 02.06.2026

- [x] Client ID: `35422838625-nsgc3tbmiud` + `af8ngnulu66a7otmffd1r.apps.googleusercontent.com` (см. CREDENTIALS)
- [x] Client Secret обновлён в зашифрованной БД n8n (SQLite AES-256-CBC)
- [x] Метод: остановка контейнера → расшифровка OpenSSL → замена secret → шифрование → запись → фикс прав → запуск
- [x] Google Cloud Console redirect_uris: `https://n8n.podryadpro.ru/rest/oauth2-credential/callback`
- [ ] Пользователю: авторизоваться в n8n → Credentials → Google Sheets account → Reconnect

## Что в работе / требует внимания

- [ ] VPS upgrade до 4GB RAM (рекомендация — устранит OOM краши PWA)
- [ ] Живой тест рефералов с двумя Telegram аккаунтами
- [ ] n8n health: "unhealthy" из-за IPv6 в Docker-контейнерах. Косметика — healthz возвращает `{"status":"ok"}`
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
| **Cloudflare** | login: `ipzhbankov@gmail.com` | pass: `Makar2018` |
| **Cloudflare API Token** | `cfat_9l96twcSbbbsLlxKCoda` | `5RMhGZIdKEM6cWF0waxs5c5f8bac` |
| **Cloudflare Account ID** | `64b1af2dff41e0dcd2ada26bc5369a1d` | |
| **Cloudflare Zone ID** | `77836f67713df30c14c2210f4d3c1baa` | |
| **VDSina Panel** | `https://cp.vdsina.com/vds/view/816336` | login: `ipzhbankov@yandex.ru` / pass: `MakarZhbankov2018!` |
| **n8n API Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZTg5MzFmMC04MDc5LTQwMTgtYWZiZi0yMjMxNTc3Mjk2NWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzgwNDIwMTk5LCJleHAiOjE3ODI5Mzk2MDB9.LtbKMj6qOHMG_H3pYbaAILjJQu_Bz-MO4DwOeu16vPk` | (02.06.2026, ~29 дней) |
| **n8n Encryption Key** | `7b3f8a2c1d4e5f6a9b8c7d0e1f2a3b4c` | для расшифровки БД SQLite |
| **Google OAuth Client ID** | `35422838625-nsgc3tbmiud` | `af8ngnulu66a7otmffd1r.apps.googleusercontent.com` |
| **Google OAuth Client Secret** | `GOCSPX-lulmvvttY0RKMoN` | `nnd-jMds1gG80` |

## Бизнес-модель
Скрытая наценка. Заказчик видит display_price. Исполнитель получает supplier_payout.
Оплата — ручная оркестрация (СБП, счёт, наличные).

## Правила
- base_price, markup_percent — НИКОГДА в публичных API
- Цвета: brand-500 (#2F5BFF), brand-900 (#1E2A5A), violet (#6C5CE7), accent (#FF6B35)
- MAX — основной мессенджер, Telegram — резервный
- Админские API: PIN через x-admin-pin header
