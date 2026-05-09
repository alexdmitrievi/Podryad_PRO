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

-- =============================================================================
-- Материалы + марки (для раздела «Стройматериалы» в ботах)
-- =============================================================================

INSERT INTO public.materials (code, name, category, unit, description) VALUES
  ('concrete',      'Бетон',   'Сыпучие',  'м³',  'Бетон M100–M400. Доставка миксером.'),
  ('crushed_stone', 'Щебень',  'Сыпучие',  'т',   'Щебень гранитный, гравийный, известняковый 5–70 мм.'),
  ('sand',          'Песок',   'Сыпучие',  'т',   'Песок карьерный, речной, мытый, строительный.'),
  ('cement',        'Цемент',  'Вяжущие',  'меш', 'Цемент M400, M500 в мешках 50 кг.'),
  ('brick',         'Кирпич',  'Штучные',  'шт',  'Кирпич рядовой, облицовочный, силикатный, керамический.')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, unit = EXCLUDED.unit, description = EXCLUDED.description;

INSERT INTO public.material_grades (material_id, grade, description, price_per_unit)
SELECT m.id, g.grade, g.description, g.price_per_unit
FROM public.materials m
CROSS JOIN (VALUES
  ('concrete',       'M100',       'Бетон M100 (стяжка, подготовка)',         5200.00),
  ('concrete',       'M150',       'Бетон M150 (дорожки, отмостка)',          5500.00),
  ('concrete',       'M200',       'Бетон M200 (фундамент)',                  5700.00),
  ('concrete',       'M250',       'Бетон M250 (перекрытия)',                 6000.00),
  ('concrete',       'M300',       'Бетон M300 (стены, колонны)',             6300.00),
  ('concrete',       'M350',       'Бетон M350 (балки)',                      6800.00),
  ('concrete',       'M400',       'Бетон M400 (ответственные конструкции)',  7500.00),
  ('crushed_stone',  '5-20',       'Гранитный щебень 5–20 мм',                1800.00),
  ('crushed_stone',  '20-40',      'Гранитный щебень 20–40 мм',               1700.00),
  ('crushed_stone',  '40-70',      'Щебень 40–70 мм',                         1500.00),
  ('crushed_stone',  'gravel',     'Гравийный щебень',                        1200.00),
  ('crushed_stone',  'limestone',  'Известняковый щебень',                    900.00),
  ('sand',           'quarry',     'Песок карьерный',                         500.00),
  ('sand',           'river',      'Песок речной',                            700.00),
  ('sand',           'washed',     'Песок мытый',                             850.00),
  ('sand',           'construction','Песок строительный',                     650.00),
  ('cement',         'M400',       'Цемент M400, мешок 50 кг',                420.00),
  ('cement',         'M500',       'Цемент M500, мешок 50 кг',                480.00),
  ('brick',          'ordinary',   'Кирпич рядовой полнотелый',               12.00),
  ('brick',          'facing',     'Кирпич облицовочный',                     18.00),
  ('brick',          'silicate',   'Кирпич силикатный',                       10.00),
  ('brick',          'ceramic',    'Кирпич керамический',                     25.00)
) AS g(code, grade, description, price_per_unit)
WHERE m.code = g.code
ON CONFLICT DO NOTHING;
