-- =============================================================================
-- Seed: Premium bot integration — services, traffic sources, tags, campaigns
-- Выполнить после применения всех миграций (033-040)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Услуги (bot_services)
-- ---------------------------------------------------------------------------
INSERT INTO public.bot_services (kind, name, short_name, description, unit, price_min, price_max, season_months, sort_order, work_type_map) VALUES
  ('lawn_mowing',    'Покос газона',         'Покос',         'Покос травы триммером или газонокосилкой', 'сотка', 500,  1500,  '{5,6,7,8,9}',    1, 'labor'),
  ('scarification',  'Скарификация',         'Скарификация',  'Скарификация газона (прочёсывание)',       'сотка', 800,  2000,  '{4,5,9}',         2, 'labor'),
  ('aeration',       'Аэрация',              'Аэрация',       'Аэрация почвы (прокалывание)',             'сотка', 600,  1800,  '{4,5,9}',         3, 'labor'),
  ('land_clearing',  'Расчистка участка',    'Расчистка',     'Расчистка участка от зарослей и мусора',   'сотка', 1500, 5000,  '{4,5,6,7,8,9,10}', 4, 'labor'),
  ('tree_cutting',   'Спил деревьев',        'Спил деревьев', 'Спил деревьев и веток',                    'шт',    1000, 10000, '{1,2,3,4,5,6,7,8,9,10,11,12}', 5, 'labor'),
  ('stump_removal',  'Корчевание пней',      'Корчевание',    'Корчевание/удаление пней',                 'шт',    500,  5000,  '{1,2,3,4,5,6,7,8,9,10,11,12}', 6, 'equipment'),
  ('debris_removal', 'Вывоз мусора',         'Вывоз мусора',  'Вывоз строительного и бытового мусора',     'м3',    500,  3000,  '{1,2,3,4,5,6,7,8,9,10,11,12}', 7, 'equipment'),
  ('pool_cleaning',  'Чистка бассейна',      'Чистка бассейна','Чистка бассейна от мусора и водорослей',  'шт',    2000, 8000,  '{5,6,7,8,9}',     8, 'labor'),
  ('pool_assembly',  'Сборка бассейна',      'Сборка бассейна','Монтаж и запуск каркасного бассейна',     'шт',    3000, 15000, '{4,5,6}',         9, 'labor')
ON CONFLICT (kind) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  price_min = EXCLUDED.price_min,
  price_max = EXCLUDED.price_max,
  season_months = EXCLUDED.season_months,
  sort_order = EXCLUDED.sort_order,
  work_type_map = EXCLUDED.work_type_map;

-- ---------------------------------------------------------------------------
-- Источники трафика (traffic_sources)
-- ---------------------------------------------------------------------------
INSERT INTO public.traffic_sources (code, name, channel, description) VALUES
  ('telegram_bot',    'Telegram-бот',    'telegram',  'Бот в Telegram @PodraydPRO_bot'),
  ('telegram_channel','Telegram-канал',  'telegram',  'Канал Подряд PRO в Telegram'),
  ('max_bot',         'MAX-бот',         'max',       'Бот в MAX @PodraydPRO_bot'),
  ('avito',           'Авито',           'avito',     'Объявления на Avito'),
  ('whatsapp',        'WhatsApp',        'whatsapp',  'Чат в WhatsApp'),
  ('phone',           'Звонок',          'phone',     'Прямой звонок'),
  ('referral',        'Реферал',         'offline',   'Реферальная программа')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Теги (tags)
-- ---------------------------------------------------------------------------
INSERT INTO public.tags (code, name, color, description) VALUES
  ('vip',             'VIP',             '#FFD700', 'VIP-клиент с повышенным приоритетом'),
  ('big_lawn',        'Большой участок', '#4CAF50', 'Участок более 20 соток'),
  ('pool_owner',      'Владелец бассейна','#2196F3','Клиент с бассейном'),
  ('repeat',          'Постоянный',      '#FF9800', 'Более 2 заказов'),
  ('cold',            'Холодный',        '#9E9E9E', 'Давно не было заказов'),
  ('district_left',   'Левый берег',     '#E91E63', 'Район: Левый берег'),
  ('district_right',  'Правый берег',    '#673AB7', 'Район: Правый берег')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Кампании (campaigns) — управляются через n8n
-- ---------------------------------------------------------------------------
INSERT INTO public.campaigns (code, name, channel, service_kind, message_text, is_active) VALUES
  ('recurring_mowing', 'Повторный покос',
   NULL, 'lawn_mowing',
   '🌿 *Пора косить!*\n\nВаш газон нуждается в свежем покосе. Хотите записаться на удобное время?\n\nНажмите «Заказать» для оформления.',
   false),
  ('seasonal_scarification', 'Сезонная скарификация',
   NULL, 'scarification',
   '🌱 *Сезон скарификации!*\n\nВесна — лучшее время для скарификации газона. Успейте записаться!\n\nНажмите «Заказать» для оформления.',
   false),
  ('seasonal_pool_open', 'Открытие бассейна',
   NULL, 'pool_assembly',
   '🏊 *Готовим бассейн к лету!*\n\nСезон открытия бассейнов стартует. Нужна помощь со сборкой и запуском?\n\nНажмите «Заказать» для оформления.',
   false)
ON CONFLICT (code) DO NOTHING;
