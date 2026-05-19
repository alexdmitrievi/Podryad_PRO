// Bot funnel state machine + parsers unit tests
import { describe, it, expect } from 'vitest';
import {
  parseAreaBucket,
  whenLabelToRange,
  estimatePriceRange,
  applyDiscountToRange,
  formatRub,
  SERVICE_LABEL,
  PRICE_RANGE,
  MATERIAL_LABEL,
  MATERIAL_GRADES,
  MATERIAL_UNIT,
  REGION_LABEL,
  UI,
  DISTRICTS,
  districtName,
  mapStatusToUi,
  canCancelStatus,
  canEditDateStatus,
} from '@/lib/bot/funnel-state';

describe('funnel-state — parsers', () => {
  it('parseAreaBucket: area:lawn:5 → до 5 соток', () => {
    const r = parseAreaBucket('area:lawn:5');
    expect(r).not.toBeNull();
    expect(r!.bucket).toBe('5');
    expect(r!.min).toBe(0);
    expect(r!.max).toBe(5);
  });

  it('parseAreaBucket: area:lawn:10 → 5–10 соток', () => {
    const r = parseAreaBucket('area:lawn:10');
    expect(r!.min).toBe(5);
    expect(r!.max).toBe(10);
  });

  it('parseAreaBucket: area:lawn:20 → 10–20 соток', () => {
    const r = parseAreaBucket('area:lawn:20');
    expect(r!.min).toBe(10);
    expect(r!.max).toBe(20);
  });

  it('parseAreaBucket: custom returns null', () => {
    expect(parseAreaBucket('area:lawn:custom')).toBeNull();
  });

  it('whenLabelToRange: today', () => {
    const r = whenLabelToRange('today');
    expect(r).not.toBeNull();
    expect(r!.human).toBe('сегодня');
  });

  it('whenLabelToRange: tomorrow', () => {
    const r = whenLabelToRange('tomorrow');
    expect(r!.human).toBe('завтра');
  });

  it('whenLabelToRange: weekend', () => {
    const r = whenLabelToRange('weekend');
    expect(r!.human).toBe('эти выходные');
  });

  it('whenLabelToRange: thisweek', () => {
    const r = whenLabelToRange('thisweek');
    expect(r!.human).toBe('на этой неделе');
  });

  it('whenLabelToRange: unknown → null', () => {
    expect(whenLabelToRange('unknown')).toBeNull();
  });
});

describe('funnel-state — pricing', () => {
  it('estimatePriceRange: lawn_mowing 10 соток', () => {
    const p = estimatePriceRange('lawn_mowing', 10);
    expect(p.low).toBeGreaterThanOrEqual(1500);
    expect(p.high).toBe(15000);
  });

  it('estimatePriceRange: concrete price range exists', () => {
    expect(PRICE_RANGE.lawn_mowing.min).toBe(500);
    expect(PRICE_RANGE.scarification.min).toBe(800);
    expect(PRICE_RANGE.pool_cleaning.min).toBe(2000);
  });

  it('applyDiscountToRange: 10% on 1000-2000 → 900-1800', () => {
    const p = applyDiscountToRange({ low: 1000, high: 2000 }, 10, 0);
    expect(p.low).toBe(900);
    expect(p.high).toBe(1800);
  });

  it('applyDiscountToRange: 10% + 500₽ bonus on 1000-2000 → 400-1300', () => {
    const p = applyDiscountToRange({ low: 1000, high: 2000 }, 10, 500);
    expect(p.low).toBe(400);
    expect(p.high).toBe(1300);
  });

  it('formatRub: 1500 → formatted with spaces', () => {
    const result = formatRub(1500);
    expect(result).toMatch(/1\s500/);
  });
});

describe('funnel-state — labels and data', () => {
  it('SERVICE_LABEL has 14 services', () => {
    expect(Object.keys(SERVICE_LABEL)).toHaveLength(14);
  });

  it('MATERIAL_LABEL has 5 materials', () => {
    expect(Object.keys(MATERIAL_LABEL)).toHaveLength(5);
  });

  it('REGION_LABEL has Omsk and Novosibirsk', () => {
    expect(REGION_LABEL.omsk).toBe('Омск');
    expect(REGION_LABEL.novosibirsk).toBe('Новосибирск');
  });

  it('DISTRICTS has 6 districts', () => {
    expect(DISTRICTS).toHaveLength(6);
  });

  it('districtName returns correct name', () => {
    expect(districtName('chkalovskiy')).toBe('Чкаловский');
    expect(districtName('unknown')).toBeUndefined();
  });

  it('MATERIAL_GRADES: concrete has 7 grades (M100-M400)', () => {
    expect(MATERIAL_GRADES.concrete).toHaveLength(7);
  });

  it('MATERIAL_UNIT: concrete→м³, sand→т, brick→шт', () => {
    expect(MATERIAL_UNIT.concrete).toBe('м³');
    expect(MATERIAL_UNIT.sand).toBe('т');
    expect(MATERIAL_UNIT.brick).toBe('шт');
    expect(MATERIAL_UNIT.cement).toBe('меш');
  });
});

describe('funnel-state — status UI', () => {
  it('mapStatusToUi: done → ✅ Выполнен', () => {
    const s = mapStatusToUi('done');
    expect(s.icon).toBe('✅');
    expect(s.label).toBe('Выполнен');
  });

  it('canCancelStatus: new→true, done→false', () => {
    expect(canCancelStatus('new')).toBe(true);
    expect(canCancelStatus('done')).toBe(false);
    expect(canCancelStatus('lost')).toBe(false);
  });

  it('canEditDateStatus: scheduled→true', () => {
    expect(canEditDateStatus('scheduled')).toBe(true);
    expect(canEditDateStatus('done')).toBe(false);
  });
});

describe('funnel-state — UI texts', () => {
  it('UI.homeWelcome contains greeting', () => {
    const text = UI.homeWelcome('Иван');
    expect(text).toContain('Иван');
    expect(text).toContain('выберите раздел');
  });

  it('UI.confirm generates correct card', () => {
    const text = UI.confirm({
      service: 'Покос газона',
      area: '5–10 соток',
      district: 'Омск, Чкаловский',
      when: 'завтра',
      priceLow: 2500,
      priceHigh: 15000,
      discountPercent: 10,
      finalLow: 2250,
      finalHigh: 13500,
    });
    expect(text).toContain('Покос газона');
    expect(text).toContain('−10%');
    expect(text).toMatch(/Итого:\s2\s?250/); // formatted with space
  });

  it('UI.materialsMenu contains 5 material types', () => {
    const text = UI.materialsMenu();
    expect(text).toContain('бетон');
    expect(text).toContain('щебень');
    expect(text).toContain('песок');
    expect(text).toContain('цемент');
    expect(text).toContain('кирпич');
  });

  it('UI.askRegion asks about city', () => {
    expect(UI.askRegion()).toContain('городе');
  });

  it('UI.askCustomerType asks about B2C/B2B', () => {
    const text = UI.askCustomerType('Иван');
    expect(text).toContain('частного дома');
    expect(text).toContain('компании');
  });
});
