/**
 * ╔══════════════════════════════════════════════════╗
 * ║  Подряд PRO — Google Sheets Setup Script v2.0   ║
 * ║  Создаёт 3 вкладки: Orders, Workers, Payments   ║
 * ╚══════════════════════════════════════════════════╝
 *
 * ИНСТРУКЦИЯ:
 * 1. Открой Google Sheets → Extensions → Apps Script
 * 2. Вставь этот код целиком
 * 3. Нажми ▶ Run → createPodraydProSheets
 * 4. Подтверди доступ при первом запуске
 */

function createPodraydProSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Удаляем старые вкладки если существуют (для идемпотентности)
  const sheetNames = ['Orders', 'Workers', 'Payments'];
  sheetNames.forEach(name => {
    const existing = ss.getSheetByName(name);
    if (existing) {
      ss.deleteSheet(existing);
    }
  });

  createOrdersSheet(ss);
  createWorkersSheet(ss);
  createPaymentsSheet(ss);

  // Удалить дефолтный "Sheet1" / "Лист1" если остался
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Лист1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.flush();
  Logger.log('✅ Все 3 вкладки созданы успешно!');
  SpreadsheetApp.getUi().alert('✅ Подряд PRO: все 3 вкладки созданы!');
}

// ═══════════════════════════════════════════════════
// ВКЛАДКА 1: Orders
// ═══════════════════════════════════════════════════
function createOrdersSheet(ss) {
  const sheet = ss.insertSheet('Orders');

  // Заголовки
  const headers = [
    'order_id',       // A — автоинкремент
    'customer_id',    // B — telegram_id заказчика
    'address',        // C — полный адрес
    'lat',            // D — широта
    'lon',            // E — долгота
    'yandex_link',    // F — deeplink
    'time',           // G — DD.MM.YYYY HH:mm
    'payment',        // H — "1500р/час"
    'people',         // I — кол-во людей
    'hours',          // J — кол-во часов
    'work_type',      // K — тип работы
    'comment',        // L — комментарий
    'status',         // M — статус
    'executor_id',    // N — telegram_id исполнителя
    'message_id',     // O — ID поста в канале
    'created_at'      // P — timestamp ISO 8601
  ];

  // Записать заголовки
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  // Автоинкремент order_id (колонка A, начиная со строки 2)
  // Формула: если B2 не пусто → ROW()-1, иначе пусто
  const formulaRange = sheet.getRange('A2:A1000');
  const formulas = [];
  for (let i = 2; i <= 1000; i++) {
    formulas.push(['=IF(B' + i + '<>"", ROW()-1, "")']);
  }
  formulaRange.setFormulas(formulas);

  // Значения по умолчанию для lat/lon Омска (в пустых ячейках не нужны)

  // Data Validation: status (колонка M)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['pending', 'published', 'closed', 'cancelled'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('M2:M1000').setDataValidation(statusRule);

  // Data Validation: work_type (колонка K)
  const workTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['грузчики', 'уборка', 'стройка', 'доставка', 'ремонт', 'другое'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('K2:K1000').setDataValidation(workTypeRule);

  // Форматирование колонок
  sheet.setColumnWidth(1, 80);   // order_id
  sheet.setColumnWidth(2, 120);  // customer_id
  sheet.setColumnWidth(3, 250);  // address
  sheet.setColumnWidth(4, 90);   // lat
  sheet.setColumnWidth(5, 90);   // lon
  sheet.setColumnWidth(6, 300);  // yandex_link
  sheet.setColumnWidth(7, 140);  // time
  sheet.setColumnWidth(8, 120);  // payment
  sheet.setColumnWidth(9, 70);   // people
  sheet.setColumnWidth(10, 70);  // hours
  sheet.setColumnWidth(11, 120); // work_type
  sheet.setColumnWidth(12, 200); // comment
  sheet.setColumnWidth(13, 100); // status
  sheet.setColumnWidth(14, 120); // executor_id
  sheet.setColumnWidth(15, 100); // message_id
  sheet.setColumnWidth(16, 180); // created_at

  // Числовой формат для lat/lon
  sheet.getRange('D2:D1000').setNumberFormat('0.0000');
  sheet.getRange('E2:E1000').setNumberFormat('0.0000');

  // Закрепить заголовок
  sheet.setFrozenRows(1);

  // Условное форматирование по статусу
  const statusRange = sheet.getRange('M2:M1000');

  // pending → жёлтый
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('pending')
    .setBackground('#fff3cd')
    .setRanges([statusRange])
    .build();

  // published → зелёный
  const publishedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('published')
    .setBackground('#d4edda')
    .setRanges([statusRange])
    .build();

  // closed → серый
  const closedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('closed')
    .setBackground('#e2e3e5')
    .setRanges([statusRange])
    .build();

  // cancelled → красный
  const cancelledRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('cancelled')
    .setBackground('#f8d7da')
    .setRanges([statusRange])
    .build();

  sheet.setConditionalFormatRules([
    pendingRule, publishedRule, closedRule, cancelledRule
  ]);

  Logger.log('✅ Orders sheet created');
}

// ═══════════════════════════════════════════════════
// ВКЛАДКА 2: Workers
// ═══════════════════════════════════════════════════
function createWorkersSheet(ss) {
  const sheet = ss.insertSheet('Workers');

  const headers = [
    'telegram_id',    // A — PK
    'username',       // B — @username
    'name',           // C — имя
    'phone',          // D — +7...
    'rating',         // E — float (default 5.0)
    'jobs_count',     // F — кол-во выполненных
    'white_list',     // G — TRUE/FALSE
    'is_vip',         // H — TRUE/FALSE
    'vip_expires_at', // I — timestamp
    'skills',         // J — грузчики,уборка,стройка
    'balance',          // K — рубли
    'ban_until',        // L — timestamp
    'created_at',       // M — timestamp
    'consecutive_low'   // N — счётчик подряд низких оценок
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#34a853');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  // Data Validation: white_list (колонка G)
  const boolRuleWL = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('G2:G1000').setDataValidation(boolRuleWL);

  // Data Validation: is_vip (колонка H)
  const boolRuleVIP = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('H2:H1000').setDataValidation(boolRuleVIP);

  // Дефолтные значения для новых строк (rating=5.0, jobs_count=0, white_list=FALSE, is_vip=FALSE, balance=0)
  // Реализуем через формулы-заглушки: если telegram_id заполнен и rating пуст → 5.0
  // Лучше оставить без формул — n8n будет записывать значения напрямую

  // Форматирование
  sheet.setColumnWidth(1, 120);  // telegram_id
  sheet.setColumnWidth(2, 130);  // username
  sheet.setColumnWidth(3, 150);  // name
  sheet.setColumnWidth(4, 130);  // phone
  sheet.setColumnWidth(5, 80);   // rating
  sheet.setColumnWidth(6, 100);  // jobs_count
  sheet.setColumnWidth(7, 90);   // white_list
  sheet.setColumnWidth(8, 80);   // is_vip
  sheet.setColumnWidth(9, 180);  // vip_expires_at
  sheet.setColumnWidth(10, 200); // skills
  sheet.setColumnWidth(11, 90);  // balance
  sheet.setColumnWidth(12, 180); // ban_until
  sheet.setColumnWidth(13, 180); // created_at
  sheet.setColumnWidth(14, 120); // consecutive_low

  // Числовой формат для rating
  sheet.getRange('E2:E1000').setNumberFormat('0.00');

  // Закрепить заголовок
  sheet.setFrozenRows(1);

  // Условное форматирование: rating
  const ratingRange = sheet.getRange('E2:E1000');

  // rating >= 4.5 → зелёный
  const goodRatingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(4.5)
    .setBackground('#d4edda')
    .setRanges([ratingRange])
    .build();

  // rating < 3.0 → красный
  const badRatingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(3.0)
    .setBackground('#f8d7da')
    .setRanges([ratingRange])
    .build();

  // is_vip = TRUE → золотой
  const vipRange = sheet.getRange('H2:H1000');
  const vipRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('TRUE')
    .setBackground('#fff8e1')
    .setFontColor('#f9a825')
    .setRanges([vipRange])
    .build();

  // ban_until не пуст → красная строка
  const banRange = sheet.getRange('L2:L1000');
  const banRule = SpreadsheetApp.newConditionalFormatRule()
    .whenCellNotEmpty()
    .setBackground('#ffcdd2')
    .setRanges([banRange])
    .build();

  sheet.setConditionalFormatRules([
    goodRatingRule, badRatingRule, vipRule, banRule
  ]);

  Logger.log('✅ Workers sheet created');
}

// ═══════════════════════════════════════════════════
// ВКЛАДКА 3: Payments
// ═══════════════════════════════════════════════════
function createPaymentsSheet(ss) {
  const sheet = ss.insertSheet('Payments');

  const headers = [
    'payment_id',     // A — uuid
    'order_id',       // B — FK → Orders.order_id
    'payer_id',       // C — telegram_id
    'amount',         // D — рубли
    'type',           // E — order|vip|pick
    'status',         // F — pending|paid|refunded|failed
    'yukassa_id',     // G — ID транзакции
    'created_at',     // H — timestamp
    'paid_at'         // I — timestamp
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#fbbc04');
  headerRange.setFontColor('#000000');
  headerRange.setHorizontalAlignment('center');

  // Data Validation: type (колонка E)
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['order', 'vip', 'pick'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('E2:E1000').setDataValidation(typeRule);

  // Data Validation: status (колонка F)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['pending', 'paid', 'refunded', 'failed'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('F2:F1000').setDataValidation(statusRule);

  // Форматирование
  sheet.setColumnWidth(1, 280);  // payment_id (uuid длинный)
  sheet.setColumnWidth(2, 80);   // order_id
  sheet.setColumnWidth(3, 120);  // payer_id
  sheet.setColumnWidth(4, 90);   // amount
  sheet.setColumnWidth(5, 80);   // type
  sheet.setColumnWidth(6, 100);  // status
  sheet.setColumnWidth(7, 250);  // yukassa_id
  sheet.setColumnWidth(8, 180);  // created_at
  sheet.setColumnWidth(9, 180);  // paid_at

  // Числовой формат для amount
  sheet.getRange('D2:D1000').setNumberFormat('#,##0');

  // Закрепить заголовок
  sheet.setFrozenRows(1);

  // Условное форматирование по статусу платежа
  const statusRange = sheet.getRange('F2:F1000');

  const paidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('paid')
    .setBackground('#d4edda')
    .setRanges([statusRange])
    .build();

  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('pending')
    .setBackground('#fff3cd')
    .setRanges([statusRange])
    .build();

  const failedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('failed')
    .setBackground('#f8d7da')
    .setRanges([statusRange])
    .build();

  const refundedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('refunded')
    .setBackground('#cce5ff')
    .setRanges([statusRange])
    .build();

  sheet.setConditionalFormatRules([
    paidRule, pendingRule, failedRule, refundedRule
  ]);

  Logger.log('✅ Payments sheet created');
}

// ═══════════════════════════════════════════════════
// БОНУС: Утилиты
// ═══════════════════════════════════════════════════

/**
 * Генерирует UUID v4 (для payment_id)
 * Использование в n8n: =generateUUID()
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Возвращает текущий timestamp ISO 8601
 * Использование: =nowISO()
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Генерирует Яндекс deeplink из координат и адреса
 * Использование: =yandexLink(lat, lon, address)
 */
function yandexLink(lat, lon, address) {
  var encoded = encodeURIComponent(address);
  return 'https://yandex.ru/maps/?pt=' + lon + ',' + lat + '&z=16&text=' + encoded;
}

/**
 * Находит следующий свободный order_id
 * (альтернатива формуле ROW()-1 при программной записи)
 */
function getNextOrderId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Orders');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  return lastRow; // т.к. ROW()-1 для строки 2 = 1, строки 3 = 2, и т.д.
}

/**
 * Меню в Google Sheets для быстрого доступа
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🔨 Подряд PRO')
    .addItem('🔄 Пересоздать все вкладки', 'createPodraydProSheets')
    .addItem('📊 Статистика заказов', 'showOrderStats')
    .addItem('🆔 Следующий order_id', 'showNextOrderId')
    .addToUi();
}

function showOrderStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Orders');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ Вкладка Orders не найдена');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var total = data.length - 1; // минус заголовок
  var published = 0, closed = 0, pending = 0, cancelled = 0;

  for (var i = 1; i < data.length; i++) {
    var status = data[i][12]; // колонка M (index 12)
    if (status === 'published') published++;
    else if (status === 'closed') closed++;
    else if (status === 'pending') pending++;
    else if (status === 'cancelled') cancelled++;
  }

  SpreadsheetApp.getUi().alert(
    '📊 Статистика Подряд PRO\n\n' +
    '📥 Всего заказов: ' + total + '\n' +
    '⏳ Ожидают: ' + pending + '\n' +
    '📤 Опубликовано: ' + published + '\n' +
    '✅ Закрыто: ' + closed + '\n' +
    '❌ Отменено: ' + cancelled + '\n' +
    '💰 Выручка: ~' + (closed * 500) + 'р'
  );
}

function showNextOrderId() {
  var nextId = getNextOrderId();
  SpreadsheetApp.getUi().alert('Следующий order_id: ' + nextId);
}
