/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║ Подряд PRO — Google Sheets Setup Script v3.0                 ║
 * ║ Создаёт 5 вкладок: Orders, Workers, Payments, Rates, ChatProxy║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * ИНСТРУКЦИЯ:
 * 1) Google Sheets -> Extensions -> Apps Script
 * 2) Вставить этот код
 * 3) Запустить createPodryadProSheets
 * 4) Подтвердить доступ при первом запуске
 */

const MAX_ROWS = 5000;
const WORK_TYPES = ['грузчики', 'уборка', 'стройка', 'разнорабочие', 'другое'];

const DEFAULT_RATES = [
  ['грузчики', 700, 500, 200, 2, true, nowISO()],
  ['уборка', 600, 400, 200, 2, true, nowISO()],
  ['стройка', 900, 650, 250, 3, true, nowISO()],
  ['разнорабочие', 650, 450, 200, 2, true, nowISO()],
  ['другое', 600, 400, 200, 1, true, nowISO()]
];

function createPodryadProSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ['Orders', 'Workers', 'Payments', 'Rates', 'ChatProxy'];

  sheetNames.forEach(name => {
    const existing = ss.getSheetByName(name);
    if (existing) ss.deleteSheet(existing);
  });

  createOrdersSheet(ss);
  createWorkersSheet(ss);
  createPaymentsSheet(ss);
  createRatesSheet(ss);
  createChatProxySheet(ss);

  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Лист1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  SpreadsheetApp.flush();
  Logger.log('OK: 5 sheets created successfully.');
  SpreadsheetApp.getUi().alert('OK: Подряд PRO v3.0 — 5 вкладок созданы.');
}

// Совместимость со старым названием функции.
function createPodraydProSheets() {
  createPodryadProSheets();
}

function createOrdersSheet(ss) {
  const sheet = ss.insertSheet('Orders');
  const headers = [
    'order_id',
    'customer_id',
    'address',
    'lat',
    'lon',
    'yandex_link',
    'time',
    'payment_text',
    'people',
    'hours',
    'work_type',
    'comment',
    'status',
    'executor_id',
    'message_id',
    'created_at',
    'client_rate',
    'worker_rate',
    'client_total',
    'worker_payout',
    'margin',
    'payout_status',
    'payout_at',
    'max_posted',
    'max_message_id'
  ];

  setHeaderRow(sheet, headers, '#1a73e8', '#ffffff');
  fillOrderIdFormula(sheet, 2, MAX_ROWS);

  applyListValidation(sheet, 'K2:K' + MAX_ROWS, WORK_TYPES, false);
  applyListValidation(sheet, 'M2:M' + MAX_ROWS, ['pending', 'paid', 'published', 'closed', 'cancelled', 'done'], false);
  applyListValidation(sheet, 'V2:V' + MAX_ROWS, ['pending', 'paid', 'held', 'refunded'], false);
  applyListValidation(sheet, 'X2:X' + MAX_ROWS, ['TRUE', 'FALSE'], false);

  sheet.getRange('D2:E' + MAX_ROWS).setNumberFormat('0.000000');
  sheet.getRange('I2:J' + MAX_ROWS).setNumberFormat('0');
  sheet.getRange('Q2:U' + MAX_ROWS).setNumberFormat('#,##0');

  setColumnWidths(sheet, [
    90, 130, 270, 95, 95, 320, 150, 210, 70, 70, 130, 220, 110, 130, 110, 190, 95, 95, 120, 130, 100, 120, 190, 100, 130
  ]);

  const statusRange = sheet.getRange('M2:M' + MAX_ROWS);
  const payoutRange = sheet.getRange('V2:V' + MAX_ROWS);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('pending').setBackground('#fff3cd').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('published').setBackground('#d4edda').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('closed').setBackground('#d1ecf1').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('cancelled').setBackground('#f8d7da').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('paid').setBackground('#e2f0d9').setRanges([payoutRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('held').setBackground('#fce8b2').setRanges([payoutRange]).build()
  ]);
}

function createWorkersSheet(ss) {
  const sheet = ss.insertSheet('Workers');
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
    'is_selfemployed',
    'card_last4',
    'accepted_offer'
  ];

  setHeaderRow(sheet, headers, '#34a853', '#ffffff');

  applyListValidation(sheet, 'G2:G' + MAX_ROWS, ['TRUE', 'FALSE'], false);
  applyListValidation(sheet, 'H2:H' + MAX_ROWS, ['TRUE', 'FALSE'], false);
  applyListValidation(sheet, 'N2:N' + MAX_ROWS, ['TRUE', 'FALSE'], false);
  applyListValidation(sheet, 'P2:P' + MAX_ROWS, ['TRUE', 'FALSE'], false);

  sheet.getRange('E2:E' + MAX_ROWS).setNumberFormat('0.00');
  sheet.getRange('F2:F' + MAX_ROWS).setNumberFormat('0');
  sheet.getRange('K2:K' + MAX_ROWS).setNumberFormat('#,##0');

  setColumnWidths(sheet, [
    130, 130, 150, 130, 80, 95, 95, 90, 180, 220, 100, 180, 190, 120, 90, 120
  ]);
}

function createPaymentsSheet(ss) {
  const sheet = ss.insertSheet('Payments');
  const headers = [
    'payment_id',
    'order_id',
    'payer_id',
    'amount',
    'type',
    'direction',
    'status',
    'yukassa_id',
    'created_at',
    'paid_at',
    'recipient_id'
  ];

  setHeaderRow(sheet, headers, '#fbbc04', '#000000');

  applyListValidation(sheet, 'E2:E' + MAX_ROWS, ['order', 'vip', 'pick', 'payout'], false);
  applyListValidation(sheet, 'F2:F' + MAX_ROWS, ['incoming', 'outgoing'], false);
  applyListValidation(sheet, 'G2:G' + MAX_ROWS, ['pending', 'paid', 'refunded', 'failed'], false);

  sheet.getRange('D2:D' + MAX_ROWS).setNumberFormat('#,##0');

  setColumnWidths(sheet, [
    280, 80, 120, 100, 90, 95, 110, 250, 190, 190, 130
  ]);
}

function createRatesSheet(ss) {
  const sheet = ss.insertSheet('Rates');
  const headers = [
    'work_type',
    'client_rate',
    'worker_rate',
    'margin',
    'min_hours',
    'is_active',
    'updated_at'
  ];

  setHeaderRow(sheet, headers, '#6f42c1', '#ffffff');
  sheet.getRange(2, 1, DEFAULT_RATES.length, DEFAULT_RATES[0].length).setValues(DEFAULT_RATES);

  applyListValidation(sheet, 'A2:A' + MAX_ROWS, WORK_TYPES, false);
  applyListValidation(sheet, 'F2:F' + MAX_ROWS, ['TRUE', 'FALSE'], false);

  // Колонка margin = client_rate - worker_rate
  const marginFormulas = [];
  for (let row = 2; row <= MAX_ROWS; row++) {
    marginFormulas.push(['=IF(OR(B' + row + '="",C' + row + '=""),"",B' + row + '-C' + row + ')']);
  }
  sheet.getRange('D2:D' + MAX_ROWS).setFormulas(marginFormulas);

  sheet.getRange('B2:E' + MAX_ROWS).setNumberFormat('#,##0');
  setColumnWidths(sheet, [150, 110, 110, 100, 90, 95, 190]);
}

function createChatProxySheet(ss) {
  const sheet = ss.insertSheet('ChatProxy');
  const headers = [
    'chat_id',
    'order_id',
    'customer_id',
    'executor_id',
    'status',
    'created_at',
    'messages_count'
  ];

  setHeaderRow(sheet, headers, '#0b7285', '#ffffff');
  applyListValidation(sheet, 'E2:E' + MAX_ROWS, ['active', 'closed'], false);

  sheet.getRange('G2:G' + MAX_ROWS).setNumberFormat('0');
  setColumnWidths(sheet, [100, 90, 130, 130, 90, 190, 120]);
}

function fillOrderIdFormula(sheet, startRow, endRow) {
  const formulas = [];
  for (let row = startRow; row <= endRow; row++) {
    formulas.push(['=IF(B' + row + '<>"",ROW()-1,"")']);
  }
  sheet.getRange('A' + startRow + ':A' + endRow).setFormulas(formulas);
}

function setHeaderRow(sheet, headers, bgColor, textColor) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(bgColor);
  headerRange.setFontColor(textColor);
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function setColumnWidths(sheet, widths) {
  for (let i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
}

function applyListValidation(sheet, a1Range, values, allowInvalid) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(allowInvalid)
    .build();
  sheet.getRange(a1Range).setDataValidation(rule);
}

function nowISO() {
  return new Date().toISOString();
}

function generateUUID() {
  return Utilities.getUuid();
}

function yandexLink(lat, lon, address) {
  const encoded = encodeURIComponent(address || '');
  return 'https://yandex.ru/maps/?pt=' + lon + ',' + lat + '&z=16&text=' + encoded;
}

function getNextOrderId() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  if (!sheet) return 1;
  const lastRow = sheet.getLastRow();
  return Math.max(1, lastRow - 1 + 1);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Podryad PRO')
    .addItem('Recreate all sheets (v3.0)', 'createPodryadProSheets')
    .addItem('Show next order_id', 'showNextOrderId')
    .addToUi();
}

function showNextOrderId() {
  SpreadsheetApp.getUi().alert('Next order_id: ' + getNextOrderId());
}
