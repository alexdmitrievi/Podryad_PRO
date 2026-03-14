/**
 * Подряд PRO — Google Apps Script
 * Автоматическое создание и настройка Google Sheets
 *
 * ИНСТРУКЦИЯ:
 * 1. Открой Google Sheets → Extensions → Apps Script
 * 2. Вставь этот код
 * 3. Run → createPodraydProSheets()
 * 4. Разреши доступ к таблице
 */

function createPodraydProSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createOrdersSheet(ss);
  createWorkersSheet(ss);
  createPaymentsSheet(ss);

  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Лист1');
  if (defaultSheet && ss.getSheets().length > 3) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.flush();
  Logger.log('✅ Подряд PRO: все 3 вкладки созданы!');
}

// ═══════════════════════════════════════════════════════════
// Вкладка 1: Orders
// ═══════════════════════════════════════════════════════════
function createOrdersSheet(ss) {
  let sheet = ss.getSheetByName('Orders');
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet('Orders');

  const headers = [
    'order_id',
    'customer_id',
    'address',
    'lat',
    'lon',
    'yandex_link',
    'time',
    'payment',
    'people',
    'hours',
    'work_type',
    'comment',
    'status',
    'executor_id',
    'message_id',
    'created_at'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0088cc');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 80);   // order_id
  sheet.setColumnWidth(2, 120);  // customer_id
  sheet.setColumnWidth(3, 300);  // address
  sheet.setColumnWidth(4, 100);  // lat
  sheet.setColumnWidth(5, 100);  // lon
  sheet.setColumnWidth(6, 350);  // yandex_link
  sheet.setColumnWidth(7, 150);  // time
  sheet.setColumnWidth(8, 120);  // payment
  sheet.setColumnWidth(9, 80);   // people
  sheet.setColumnWidth(10, 80);  // hours
  sheet.setColumnWidth(11, 120); // work_type
  sheet.setColumnWidth(12, 250); // comment
  sheet.setColumnWidth(13, 100); // status
  sheet.setColumnWidth(14, 120); // executor_id
  sheet.setColumnWidth(15, 120); // message_id
  sheet.setColumnWidth(16, 180); // created_at

  // order_id: автоинкремент =ROW()-1 для строк 2-500
  const idFormulas = [];
  for (let i = 2; i <= 500; i++) {
    idFormulas.push(['=IF(B' + i + '<>"", ROW()-1, "")']);
  }
  sheet.getRange(2, 1, 499, 1).setFormulas(idFormulas);

  // Валидация: work_type — enum
  const workTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['грузчики', 'уборка', 'стройка', 'другое'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 11, 498, 1).setDataValidation(workTypeRule);

  // Валидация: status — enum
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['pending', 'published', 'closed', 'cancelled'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 13, 498, 1).setDataValidation(statusRule);

  // Формат lat/lon — число с 4 знаками
  sheet.getRange(2, 4, 498, 2).setNumberFormat('0.0000');

  // Условное форматирование: status
  applyStatusFormatting(sheet, 13, 498);

  Logger.log('✅ Orders sheet created');
}

// ═══════════════════════════════════════════════════════════
// Вкладка 2: Workers
// ═══════════════════════════════════════════════════════════
function createWorkersSheet(ss) {
  let sheet = ss.getSheetByName('Workers');
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet('Workers');

  const headers = [
    'telegram_id',
    'username',
    'name',
    'phone',
    'rating',
    'jobs_count',
    'white_list',
    'is_vip',
    'vip_expires_at',
    'skills',
    'balance',
    'ban_until',
    'created_at',
    'consecutive_low'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#28a745');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 120);  // telegram_id
  sheet.setColumnWidth(2, 130);  // username
  sheet.setColumnWidth(3, 150);  // name
  sheet.setColumnWidth(4, 130);  // phone
  sheet.setColumnWidth(5, 80);   // rating
  sheet.setColumnWidth(6, 100);  // jobs_count
  sheet.setColumnWidth(7, 90);   // white_list
  sheet.setColumnWidth(8, 80);   // is_vip
  sheet.setColumnWidth(9, 180);  // vip_expires_at
  sheet.setColumnWidth(10, 250); // skills
  sheet.setColumnWidth(11, 80);  // balance
  sheet.setColumnWidth(12, 180); // ban_until
  sheet.setColumnWidth(13, 180); // created_at
  sheet.setColumnWidth(14, 120); // consecutive_low

  // Валидация: white_list — TRUE/FALSE
  const boolRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, 498, 1).setDataValidation(boolRule);

  // Валидация: is_vip — TRUE/FALSE
  sheet.getRange(2, 8, 498, 1).setDataValidation(boolRule);

  // rating — формат 0.00
  sheet.getRange(2, 5, 498, 1).setNumberFormat('0.00');

  // balance — формат числа
  sheet.getRange(2, 11, 498, 1).setNumberFormat('#,##0');

  // Условное форматирование: VIP строки
  const vipRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('TRUE')
    .setBackground('#fff3cd')
    .setRanges([sheet.getRange(2, 8, 498, 1)])
    .build();
  sheet.setConditionalFormatRules([vipRule]);

  Logger.log('✅ Workers sheet created');
}

// ═══════════════════════════════════════════════════════════
// Вкладка 3: Payments
// ═══════════════════════════════════════════════════════════
function createPaymentsSheet(ss) {
  let sheet = ss.getSheetByName('Payments');
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet('Payments');

  const headers = [
    'payment_id',
    'order_id',
    'payer_id',
    'amount',
    'type',
    'status',
    'yukassa_id',
    'created_at',
    'paid_at'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#ffc107');
  headerRange.setFontColor('#000000');
  headerRange.setHorizontalAlignment('center');

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 300);  // payment_id (uuid)
  sheet.setColumnWidth(2, 80);   // order_id
  sheet.setColumnWidth(3, 120);  // payer_id
  sheet.setColumnWidth(4, 80);   // amount
  sheet.setColumnWidth(5, 80);   // type
  sheet.setColumnWidth(6, 100);  // status
  sheet.setColumnWidth(7, 300);  // yukassa_id
  sheet.setColumnWidth(8, 180);  // created_at
  sheet.setColumnWidth(9, 180);  // paid_at

  // Валидация: type — enum
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['order', 'vip', 'pick'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, 498, 1).setDataValidation(typeRule);

  // Валидация: status — enum
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['pending', 'paid', 'refunded', 'failed'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, 498, 1).setDataValidation(statusRule);

  // amount — формат рублей
  sheet.getRange(2, 4, 498, 1).setNumberFormat('#,##0 ₽');

  // Условное форматирование: payment status
  const paidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('paid')
    .setBackground('#d4edda')
    .setFontColor('#155724')
    .setRanges([sheet.getRange(2, 6, 498, 1)])
    .build();

  const failedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('failed')
    .setBackground('#f8d7da')
    .setFontColor('#721c24')
    .setRanges([sheet.getRange(2, 6, 498, 1)])
    .build();

  const refundedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('refunded')
    .setBackground('#cce5ff')
    .setFontColor('#004085')
    .setRanges([sheet.getRange(2, 6, 498, 1)])
    .build();

  sheet.setConditionalFormatRules([paidRule, failedRule, refundedRule]);

  Logger.log('✅ Payments sheet created');
}

// ═══════════════════════════════════════════════════════════
// Хелпер: условное форматирование статусов заказов
// ═══════════════════════════════════════════════════════════
function applyStatusFormatting(sheet, col, rows) {
  const range = sheet.getRange(2, col, rows, 1);

  const publishedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('published')
    .setBackground('#d4edda')
    .setFontColor('#155724')
    .setRanges([range])
    .build();

  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('pending')
    .setBackground('#fff3cd')
    .setFontColor('#856404')
    .setRanges([range])
    .build();

  const closedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('closed')
    .setBackground('#e2e3e5')
    .setFontColor('#383d41')
    .setRanges([range])
    .build();

  const cancelledRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('cancelled')
    .setBackground('#f8d7da')
    .setFontColor('#721c24')
    .setRanges([range])
    .build();

  sheet.setConditionalFormatRules([publishedRule, pendingRule, closedRule, cancelledRule]);
}

// ═══════════════════════════════════════════════════════════
// Бонус: тестовые данные для проверки
// ═══════════════════════════════════════════════════════════
function insertTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Тестовый воркер
  const workers = ss.getSheetByName('Workers');
  workers.getRange(2, 1, 1, 13).setValues([[
    '123456789',
    '@test_worker',
    'Иван Петров',
    '+79001234567',
    5.0,
    0,
    'TRUE',
    'FALSE',
    '',
    'грузчики,стройка',
    0,
    '',
    new Date().toISOString()
  ]]);

  // Тестовый заказ (customer_id в колонке B запустит формулу order_id)
  const orders = ss.getSheetByName('Orders');
  orders.getRange(2, 2, 1, 15).setValues([[
    '987654321',
    'г. Омск, ул. Ленина, 10',
    54.9894,
    73.3667,
    'https://yandex.ru/maps/?pt=73.3667,54.9894&z=16&text=%D0%B3.+%D0%9E%D0%BC%D1%81%D0%BA%2C+%D1%83%D0%BB.+%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0%2C+10',
    '15.03.2026 10:00',
    '1500р/час',
    3,
    4,
    'грузчики',
    'Переезд, 3 этаж без лифта',
    'pending',
    '',
    '',
    new Date().toISOString()
  ]]);

  // Тестовый платёж
  const payments = ss.getSheetByName('Payments');
  payments.getRange(2, 1, 1, 9).setValues([[
    Utilities.getUuid(),
    1,
    '987654321',
    500,
    'order',
    'pending',
    '',
    new Date().toISOString(),
    ''
  ]]);

  Logger.log('✅ Тестовые данные добавлены!');
}

// ═══════════════════════════════════════════════════════════
// Утилита: очистить все данные (кроме заголовков)
// ═══════════════════════════════════════════════════════════
function clearAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Orders: clear from col B onwards to preserve col A formulas
  var ordersSheet = ss.getSheetByName('Orders');
  if (ordersSheet && ordersSheet.getLastRow() > 1) {
    ordersSheet.getRange(2, 2, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn() - 1).clearContent();
  }

  // Workers and Payments: clear all data rows
  ['Workers', 'Payments'].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  });
  Logger.log('🗑 Все данные очищены (заголовки и формулы сохранены)');
}

// ═══════════════════════════════════════════════════════════
// Триггер: автоматическая метка времени при добавлении строки
// ═══════════════════════════════════════════════════════════
function onEdit(e) {
  if (!e) return;
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row <= 1) return;

  // Orders: created_at (col P = 16) при заполнении customer_id (col B = 2)
  if (sheetName === 'Orders' && col === 2 && e.value) {
    const timestampCell = sheet.getRange(row, 16);
    if (!timestampCell.getValue()) {
      timestampCell.setValue(new Date().toISOString());
    }
  }

  // Workers: created_at (col M = 13) при заполнении telegram_id (col A = 1)
  if (sheetName === 'Workers' && col === 1 && e.value) {
    const timestampCell = sheet.getRange(row, 13);
    if (!timestampCell.getValue()) {
      timestampCell.setValue(new Date().toISOString());
    }
  }

  // Payments: created_at (col H = 8) при заполнении payment_id (col A = 1)
  if (sheetName === 'Payments' && col === 1 && e.value) {
    const timestampCell = sheet.getRange(row, 8);
    if (!timestampCell.getValue()) {
      timestampCell.setValue(new Date().toISOString());
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Установить onEdit триггер
// ═══════════════════════════════════════════════════════════
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log('✅ Триггер onEdit установлен');
}
