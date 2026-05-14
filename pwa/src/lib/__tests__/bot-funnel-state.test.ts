import { describe, it, expect } from 'vitest';
import {
  parseArea,
  parseAreaBucket,
  estimatePriceRange,
  applyDiscountToRange,
  canCancelStatus,
  canEditDateStatus,
  districtName,
} from '../bot/funnel-state';

describe('parseArea', () => {
  it('parses "5 соток" → 5 сотка', () => {
    expect(parseArea('5 соток')).toEqual({ value: 5, unit: 'сотка' });
  });

  it('parses "10.5 сот" → 10.5 сотка', () => {
    expect(parseArea('10.5 сот')).toEqual({ value: 10.5, unit: 'сотка' });
  });

  it('parses "100 м2" → 100 м2', () => {
    expect(parseArea('100 м2')).toEqual({ value: 100, unit: 'м2' });
  });

  it('parses "50 м²" → 50 м2', () => {
    expect(parseArea('50 м²')).toEqual({ value: 50, unit: 'м2' });
  });

  it('parses "1.5 га" → 1.5 га', () => {
    expect(parseArea('1.5 га')).toEqual({ value: 1.5, unit: 'га' });
  });

  it('parses "2 кв.м" → 2 м2', () => {
    expect(parseArea('2 кв.м')).toEqual({ value: 2, unit: 'м2' });
  });

  it('parses "3 кв" → 3 м2', () => {
    expect(parseArea('3 кв')).toEqual({ value: 3, unit: 'м2' });
  });

  it('returns default unit сотка for "5" alone', () => {
    expect(parseArea('5')).toEqual({ value: 5, unit: 'сотка' });
  });

  it('handles comma as decimal separator', () => {
    expect(parseArea('3,5 сот')).toEqual({ value: 3.5, unit: 'сотка' });
  });

  it('returns null for non-numeric input "abc"', () => {
    expect(parseArea('abc')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseArea('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(parseArea('   ')).toBeNull();
  });
});

describe('parseAreaBucket', () => {
  it('parses "area:lawn_mowing:10" → bucket 10, min 5, max 10', () => {
    expect(parseAreaBucket('area:lawn_mowing:10')).toEqual({
      bucket: '10',
      min: 5,
      max: 10,
      unit: 'сотка',
    });
  });

  it('parses "area:lawn_mowing:20" → bucket 20, min 10, max 20', () => {
    expect(parseAreaBucket('area:lawn_mowing:20')).toEqual({
      bucket: '20',
      min: 10,
      max: 20,
      unit: 'сотка',
    });
  });

  it('parses "area:lawn_mowing:30" → bucket 30, min 20, max 30', () => {
    expect(parseAreaBucket('area:lawn_mowing:30')).toEqual({
      bucket: '30',
      min: 20,
      max: 30,
      unit: 'сотка',
    });
  });

  it('returns null for "area:lawn_mowing:custom"', () => {
    expect(parseAreaBucket('area:lawn_mowing:custom')).toBeNull();
  });

  it('returns null for arbitrary string "wrong_format"', () => {
    expect(parseAreaBucket('wrong_format')).toBeNull();
  });

  it('works with different service kinds', () => {
    expect(parseAreaBucket('area:tree_cutting:10')).toEqual({
      bucket: '10',
      min: 5,
      max: 10,
      unit: 'сотка',
    });
  });
});

describe('estimatePriceRange', () => {
  it('returns correct range for lawn_mowing, 5 соток', () => {
    const range = estimatePriceRange('lawn_mowing', 5);
    // minOrder = 1500, min = 500, max = 1500
    // low = max(1500, round(500*5)) = max(1500, 2500) = 2500
    // high = max(1500, round(1500*5)) = max(1500, 7500) = 7500
    expect(range.low).toBeGreaterThanOrEqual(2500);
    expect(range.high).toBeGreaterThanOrEqual(7500);
    expect(range.low).toBe(2500);
    expect(range.high).toBe(7500);
  });

  it('returns correct range for tree_cutting, 3 деревa', () => {
    const range = estimatePriceRange('tree_cutting', 3);
    // No minOrder, min = 1000, max = 10000
    expect(range.low).toBe(3000);
    expect(range.high).toBe(30000);
  });

  it('respects minOrder for scarification', () => {
    // scarification: min=800, max=2000, no minOrder → minOrder=0
    const range = estimatePriceRange('scarification', 0.5);
    expect(range.low).toBe(400);
    expect(range.high).toBe(1000);
  });

  it('handles area smaller than minOrder', () => {
    // lawn_mowing with 1 unit: low = max(1500, 500) = 1500
    const range = estimatePriceRange('lawn_mowing', 1);
    expect(range.low).toBe(1500);
    expect(range.high).toBe(1500);
  });
});

describe('applyDiscountToRange', () => {
  it('applies percentage discount correctly', () => {
    const result = applyDiscountToRange({ low: 5000, high: 10000 }, 10, 0);
    expect(result.low).toBe(4500);
    expect(result.high).toBe(9000);
  });

  it('applies fixed bonus rub discount', () => {
    const result = applyDiscountToRange({ low: 5000, high: 10000 }, 0, 500);
    expect(result.low).toBe(4500);
    expect(result.high).toBe(9500);
  });

  it('applies both percent and bonus rub', () => {
    const result = applyDiscountToRange({ low: 5000, high: 10000 }, 10, 500);
    // low: round(5000 * 0.9) - 500 = 4500 - 500 = 4000
    // high: round(10000 * 0.9) - 500 = 9000 - 500 = 8500
    expect(result.low).toBe(4000);
    expect(result.high).toBe(8500);
  });

  it('never returns negative values', () => {
    const result = applyDiscountToRange({ low: 10, high: 10 }, 100, 0);
    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
  });

  it('clamps to zero with small values and large discount', () => {
    const result = applyDiscountToRange({ low: 100, high: 200 }, 50, 100);
    // low: round(100 * 0.5) - 100 = 50 - 100 = -50 → max(0, -50) = 0
    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
  });
});

describe('canCancelStatus', () => {
  it.each(['new', 'qualifying', 'qualified', 'quoted', 'scheduled'])(
    'returns true for editable status %s',
    (status) => {
      expect(canCancelStatus(status)).toBe(true);
    },
  );

  it.each(['in_progress', 'done', 'lost', 'completed', 'closed', 'cancelled'])(
    'returns false for non-editable status %s',
    (status) => {
      expect(canCancelStatus(status)).toBe(false);
    },
  );
});

describe('canEditDateStatus', () => {
  it.each(['new', 'qualifying', 'qualified', 'quoted', 'scheduled'])(
    'returns true for editable status %s',
    (status) => {
      expect(canEditDateStatus(status)).toBe(true);
    },
  );

  it.each(['in_progress', 'done', 'lost', 'completed'])(
    'returns false for non-editable status %s',
    (status) => {
      expect(canEditDateStatus(status)).toBe(false);
    },
  );
});

describe('districtName', () => {
  it('returns Чкаловский for chkalovskiy', () => {
    expect(districtName('chkalovskiy')).toBe('Чкаловский');
  });

  it('returns Кировский for kirovskiy', () => {
    expect(districtName('kirovskiy')).toBe('Кировский');
  });

  it('returns Ленинский for leninskiy', () => {
    expect(districtName('leninskiy')).toBe('Ленинский');
  });

  it('returns undefined for unrecognized code', () => {
    expect(districtName('nonexistent')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(districtName(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(districtName('')).toBeUndefined();
  });
});
