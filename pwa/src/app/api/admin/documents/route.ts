import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(adminPin);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Types of documents
type DocType = 'invoice' | 'act' | 'upd' | 'nakladnaya';

interface DocRequest {
  order_id: string;
  doc_type: DocType;
  // Company details (for legal entities)
  company_name?: string;
  inn?: string;
  kpp?: string;
  address?: string;
  // Explicit overrides
  amount?: number;
  description?: string;
}

function formatDateRu(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(val: number): string {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

// Number to words (Russian) — simplified for amounts
function numberToWords(n: number): string {
  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  const whole = Math.floor(n);
  const kop = Math.round((n - whole) * 100);

  if (whole === 0) return `ноль руб. ${String(kop).padStart(2, '0')} коп.`;

  let result = '';
  const th = Math.floor(whole / 1000);
  const rem = whole % 1000;

  if (th > 0) {
    const thH = Math.floor(th / 100);
    const thR = th % 100;
    if (thH > 0) result += hundreds[thH] + ' ';
    if (thR >= 10 && thR < 20) { result += teens[thR - 10] + ' '; }
    else {
      if (Math.floor(thR / 10) > 0) result += tens[Math.floor(thR / 10)] + ' ';
      const u = thR % 10;
      if (u === 1) result += 'одна ';
      else if (u === 2) result += 'две ';
      else if (u > 0) result += units[u] + ' ';
    }
    const lastTwo = th % 100;
    const lastOne = th % 10;
    if (lastTwo >= 11 && lastTwo <= 19) result += 'тысяч ';
    else if (lastOne === 1) result += 'тысяча ';
    else if (lastOne >= 2 && lastOne <= 4) result += 'тысячи ';
    else result += 'тысяч ';
  }

  const h = Math.floor(rem / 100);
  const r = rem % 100;
  if (h > 0) result += hundreds[h] + ' ';
  if (r >= 10 && r < 20) { result += teens[r - 10] + ' '; }
  else {
    if (Math.floor(r / 10) > 0) result += tens[Math.floor(r / 10)] + ' ';
    const u = r % 10;
    if (u > 0) result += units[u] + ' ';
  }

  const lastTwoR = whole % 100;
  const lastOneR = whole % 10;
  if (lastTwoR >= 11 && lastTwoR <= 19) result += 'рублей';
  else if (lastOneR === 1) result += 'рубль';
  else if (lastOneR >= 2 && lastOneR <= 4) result += 'рубля';
  else result += 'рублей';

  result += ` ${String(kop).padStart(2, '0')} коп.`;
  return result.trim();
}

const DOC_LABELS: Record<DocType, string> = {
  invoice: 'Счёт',
  act: 'Акт выполненных работ',
  upd: 'Универсальный передаточный документ (УПД)',
  nakladnaya: 'Товарная накладная',
};

function generateDocHtml(
  docType: DocType,
  order: Record<string, unknown>,
  docNumber: string,
  params: DocRequest
): string {
  const now = new Date();
  const dateStr = formatDateRu(now);
  const amount = params.amount || Number(order.display_price) || Number(order.customer_total) || 0;
  const description = params.description || `${order.work_type || 'Услуги'}${order.subcategory ? ' / ' + order.subcategory : ''}`;
  const workDate = order.work_date ? String(order.work_date) : dateStr;

  const sellerName = process.env.COMPANY_NAME || 'ИП Подряд ПРО';
  const sellerInn = process.env.COMPANY_INN || '';
  const sellerAddress = process.env.COMPANY_ADDRESS || '';
  const sellerBank = process.env.COMPANY_BANK || '';
  const sellerBik = process.env.COMPANY_BIK || '';
  const sellerAccount = process.env.COMPANY_ACCOUNT || '';
  const sellerCorr = process.env.COMPANY_CORR_ACCOUNT || '';

  const buyerName = params.company_name || String(order.customer_name || 'Физическое лицо');
  const buyerInn = params.inn || '';
  const buyerKpp = params.kpp || '';
  const buyerAddress = params.address || String(order.address || '');

  const title = DOC_LABELS[docType];
  const orderNum = order.order_number || order.order_id || docNumber;

  const commonStyles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; padding: 40px; max-width: 210mm; }
      .header { text-align: center; margin-bottom: 24px; }
      .title { font-size: 16pt; font-weight: bold; margin-bottom: 4px; }
      .subtitle { font-size: 10pt; color: #555; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 11pt; }
      th { background: #f5f5f5; font-weight: bold; text-align: center; }
      .right { text-align: right; }
      .center { text-align: center; }
      .total-row td { font-weight: bold; }
      .bank-details { margin: 16px 0; font-size: 10pt; }
      .bank-details td { border: 1px solid #ccc; padding: 4px 8px; }
      .signatures { margin-top: 48px; display: flex; justify-content: space-between; }
      .sig-block { width: 45%; }
      .sig-line { border-bottom: 1px solid #000; margin-top: 40px; margin-bottom: 4px; }
      .sig-label { font-size: 9pt; color: #555; }
      .parties { margin: 12px 0; font-size: 11pt; }
      .party { margin-bottom: 8px; }
      .party-label { font-weight: bold; }
      .stamp-area { width: 120px; height: 120px; border: 1px dashed #ccc; display: inline-block; margin-top: 8px; }
      @media print { body { padding: 20px; } .no-print { display: none; } }
    </style>
  `;

  if (docType === 'invoice') {
    return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${title} №${docNumber}</title>${commonStyles}</head><body>
      <div class="bank-details">
        <table>
          <tr><td colspan="2" style="border:none;font-size:10pt;color:#555;">Банковские реквизиты</td></tr>
          <tr><td style="width:30%;">Получатель</td><td><b>${sellerName}</b></td></tr>
          <tr><td>ИНН</td><td>${sellerInn}</td></tr>
          <tr><td>Р/с</td><td>${sellerAccount}</td></tr>
          <tr><td>Банк</td><td>${sellerBank}</td></tr>
          <tr><td>БИК</td><td>${sellerBik}</td></tr>
          <tr><td>Корр. счёт</td><td>${sellerCorr}</td></tr>
        </table>
      </div>
      <div class="header">
        <div class="title">${title} № ${docNumber}</div>
        <div class="subtitle">от ${dateStr}</div>
      </div>
      <div class="parties">
        <div class="party"><span class="party-label">Поставщик:</span> ${sellerName}${sellerInn ? ', ИНН ' + sellerInn : ''}${sellerAddress ? ', ' + sellerAddress : ''}</div>
        <div class="party"><span class="party-label">Покупатель:</span> ${buyerName}${buyerInn ? ', ИНН ' + buyerInn : ''}${buyerKpp ? ', КПП ' + buyerKpp : ''}${buyerAddress ? ', ' + buyerAddress : ''}</div>
      </div>
      <div class="subtitle">Основание: Заказ ${orderNum}</div>
      <table>
        <thead><tr><th style="width:5%;">№</th><th>Наименование</th><th style="width:10%;">Кол-во</th><th style="width:10%;">Ед.</th><th style="width:15%;">Цена</th><th style="width:15%;">Сумма</th></tr></thead>
        <tbody>
          <tr><td class="center">1</td><td>${description}</td><td class="center">1</td><td class="center">усл.</td><td class="right">${formatMoney(amount)}</td><td class="right">${formatMoney(amount)}</td></tr>
          <tr class="total-row"><td colspan="5" class="right">Итого:</td><td class="right">${formatMoney(amount)}</td></tr>
          <tr class="total-row"><td colspan="5" class="right">НДС не облагается</td><td class="right">—</td></tr>
          <tr class="total-row"><td colspan="5" class="right">Всего к оплате:</td><td class="right">${formatMoney(amount)}</td></tr>
        </tbody>
      </table>
      <p style="margin-top:8px;font-size:11pt;"><b>Всего наименований 1, на сумму ${formatMoney(amount)} руб.</b></p>
      <p style="font-size:11pt;font-style:italic;">${numberToWords(amount)}</p>
      <p style="margin-top:16px;font-size:10pt;color:#555;">Счёт действителен в течение 5 банковских дней.</p>
      <div class="signatures">
        <div class="sig-block"><div class="sig-line"></div><div class="sig-label">${sellerName}</div></div>
      </div>
    </body></html>`;
  }

  if (docType === 'act') {
    return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${title} №${docNumber}</title>${commonStyles}</head><body>
      <div class="header">
        <div class="title">${title}</div>
        <div class="subtitle">№ ${docNumber} от ${dateStr}</div>
      </div>
      <div class="parties">
        <div class="party"><span class="party-label">Исполнитель:</span> ${sellerName}${sellerInn ? ', ИНН ' + sellerInn : ''}${sellerAddress ? ', ' + sellerAddress : ''}</div>
        <div class="party"><span class="party-label">Заказчик:</span> ${buyerName}${buyerInn ? ', ИНН ' + buyerInn : ''}${buyerKpp ? ', КПП ' + buyerKpp : ''}${buyerAddress ? ', ' + buyerAddress : ''}</div>
      </div>
      <p style="margin:12px 0;font-size:11pt;">Исполнитель выполнил, а Заказчик принял следующие работы/услуги:</p>
      <table>
        <thead><tr><th style="width:5%;">№</th><th>Наименование работ/услуг</th><th style="width:10%;">Кол-во</th><th style="width:10%;">Ед.</th><th style="width:15%;">Цена</th><th style="width:15%;">Сумма</th></tr></thead>
        <tbody>
          <tr><td class="center">1</td><td>${description}</td><td class="center">1</td><td class="center">усл.</td><td class="right">${formatMoney(amount)}</td><td class="right">${formatMoney(amount)}</td></tr>
          <tr class="total-row"><td colspan="5" class="right">Итого:</td><td class="right">${formatMoney(amount)}</td></tr>
          <tr class="total-row"><td colspan="5" class="right">НДС не облагается</td><td class="right">—</td></tr>
          <tr class="total-row"><td colspan="5" class="right">Всего:</td><td class="right">${formatMoney(amount)}</td></tr>
        </tbody>
      </table>
      <p style="margin:12px 0;font-size:11pt;">Вышеперечисленные работы (услуги) выполнены полностью и в срок. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.</p>
      <p style="font-size:11pt;font-style:italic;">Всего оказано услуг на сумму: ${numberToWords(amount)}</p>
      <div class="signatures">
        <div class="sig-block"><div class="sig-label" style="font-weight:bold;">Исполнитель:</div><div class="sig-line"></div><div class="sig-label">${sellerName}</div><div class="stamp-area"></div></div>
        <div class="sig-block"><div class="sig-label" style="font-weight:bold;">Заказчик:</div><div class="sig-line"></div><div class="sig-label">${buyerName}</div><div class="stamp-area"></div></div>
      </div>
    </body></html>`;
  }

  if (docType === 'upd') {
    return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${title} №${docNumber}</title>${commonStyles}</head><body>
      <div class="header">
        <div class="title">Универсальный передаточный документ (УПД)</div>
        <div class="subtitle">Статус: 2 (используется как первичный учётный документ)</div>
        <div class="subtitle">№ ${docNumber} от ${dateStr}</div>
      </div>
      <div class="parties">
        <div class="party"><span class="party-label">Продавец:</span> ${sellerName}${sellerInn ? ', ИНН ' + sellerInn : ''}${sellerAddress ? ', ' + sellerAddress : ''}</div>
        <div class="party"><span class="party-label">Покупатель:</span> ${buyerName}${buyerInn ? ', ИНН ' + buyerInn : ''}${buyerKpp ? ', КПП ' + buyerKpp : ''}${buyerAddress ? ', ' + buyerAddress : ''}</div>
        <div class="party"><span class="party-label">Основание передачи:</span> Договор-оферта (Заказ ${orderNum})</div>
      </div>
      <table>
        <thead><tr><th style="width:5%;">№</th><th>Наименование товара (описание выполненных работ)</th><th style="width:8%;">Код</th><th style="width:8%;">Ед.</th><th style="width:8%;">Кол-во</th><th style="width:12%;">Цена</th><th style="width:12%;">Стоимость без НДС</th><th style="width:8%;">НДС</th><th style="width:12%;">Стоимость с НДС</th></tr></thead>
        <tbody>
          <tr><td class="center">1</td><td>${description}</td><td class="center">—</td><td class="center">усл.</td><td class="center">1</td><td class="right">${formatMoney(amount)}</td><td class="right">${formatMoney(amount)}</td><td class="center">Без НДС</td><td class="right">${formatMoney(amount)}</td></tr>
          <tr class="total-row"><td colspan="6" class="right">Всего к оплате:</td><td class="right">${formatMoney(amount)}</td><td></td><td class="right">${formatMoney(amount)}</td></tr>
        </tbody>
      </table>
      <p style="font-size:11pt;font-style:italic;">${numberToWords(amount)}</p>
      <table style="margin-top:24px;">
        <tr><td style="width:50%;vertical-align:top;border:none;">
          <p style="font-weight:bold;margin-bottom:8px;">Товар (груз) передал / услугу оказал:</p>
          <div class="sig-line" style="margin-top:32px;"></div>
          <div class="sig-label">${sellerName}</div>
          <p style="margin-top:4px;font-size:10pt;">Дата: ${dateStr}</p>
        </td><td style="width:50%;vertical-align:top;border:none;">
          <p style="font-weight:bold;margin-bottom:8px;">Товар (груз) получил / услугу принял:</p>
          <div class="sig-line" style="margin-top:32px;"></div>
          <div class="sig-label">${buyerName}</div>
          <p style="margin-top:4px;font-size:10pt;">Дата: _______________</p>
        </td></tr>
      </table>
    </body></html>`;
  }

  // nakladnaya
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Товарная накладная №${docNumber}</title>${commonStyles}</head><body>
    <div class="header">
      <div class="title">ТОВАРНАЯ НАКЛАДНАЯ</div>
      <div class="subtitle">№ ${docNumber} от ${dateStr}</div>
    </div>
    <div class="parties">
      <div class="party"><span class="party-label">Поставщик:</span> ${sellerName}${sellerInn ? ', ИНН ' + sellerInn : ''}${sellerAddress ? ', ' + sellerAddress : ''}</div>
      <div class="party"><span class="party-label">Грузополучатель:</span> ${buyerName}${buyerInn ? ', ИНН ' + buyerInn : ''}${buyerAddress ? ', ' + buyerAddress : ''}</div>
      <div class="party"><span class="party-label">Основание:</span> Заказ ${orderNum}</div>
    </div>
    <table>
      <thead><tr><th style="width:5%;">№</th><th>Наименование</th><th style="width:10%;">Ед.</th><th style="width:10%;">Кол-во</th><th style="width:15%;">Цена</th><th style="width:15%;">Сумма</th></tr></thead>
      <tbody>
        <tr><td class="center">1</td><td>${description}</td><td class="center">шт.</td><td class="center">1</td><td class="right">${formatMoney(amount)}</td><td class="right">${formatMoney(amount)}</td></tr>
        <tr class="total-row"><td colspan="5" class="right">Итого:</td><td class="right">${formatMoney(amount)}</td></tr>
      </tbody>
    </table>
    <p style="font-size:11pt;margin-top:8px;"><b>Всего наименований 1, на сумму ${formatMoney(amount)} руб.</b></p>
    <p style="font-size:11pt;font-style:italic;">${numberToWords(amount)}</p>
    <div class="signatures">
      <div class="sig-block"><div class="sig-label" style="font-weight:bold;">Отпустил:</div><div class="sig-line"></div><div class="sig-label">${sellerName}</div></div>
      <div class="sig-block"><div class="sig-label" style="font-weight:bold;">Получил:</div><div class="sig-line"></div><div class="sig-label">${buyerName}</div></div>
    </div>
  </body></html>`;
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') || '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: DocRequest;
  try {
    body = await req.json() as DocRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validTypes: DocType[] = ['invoice', 'act', 'upd', 'nakladnaya'];
  if (!body.order_id || !validTypes.includes(body.doc_type)) {
    return NextResponse.json({ error: 'order_id and valid doc_type required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: order, error } = await db
    .from('orders')
    .select('order_id, order_number, work_type, subcategory, customer_name, customer_phone, address, display_price, customer_total, people_count, hours, work_date, customer_type, invoice_number')
    .eq('order_id', body.order_id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Generate document number
  const docNumber = order.invoice_number || `${body.doc_type.toUpperCase()}-${(order.order_number || order.order_id).slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

  // Save document number to order if not already set (for invoices)
  if (body.doc_type === 'invoice' && !order.invoice_number) {
    await db.from('orders').update({ invoice_number: docNumber }).eq('order_id', body.order_id);
  }

  const html = generateDocHtml(body.doc_type, order as Record<string, unknown>, docNumber, body);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${body.doc_type}-${docNumber}.html"`,
    },
  });
}
