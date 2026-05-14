import { describe, it, expect } from 'vitest';
import { applyMarkup, getComboDiscountRate, calculateOrderTotals } from '../pricing';

describe('applyMarkup', () => {
  it('calculates display price for base=1000, markup=15', () => {
    const result = applyMarkup(1000, 15);
    expect(result.displayPrice).toBe(1150);
    expect(result.basePrice).toBe(1000);
    expect(result.markupPercent).toBe(15);
  });

  it('rounds up to nearest 5 when needed', () => {
    const result = applyMarkup(200, 25);
    // 200 * 1.25 = 250, ceil(250/5)*5 = 250
    expect(result.displayPrice).toBe(250);
  });

  it('rounds 1148.85 up to 1150', () => {
    const result = applyMarkup(999, 15);
    // 999 * 1.15 = 1148.85, ceil(1148.85/5)*5 = ceil(229.77)*5 = 230*5 = 1150
    expect(result.displayPrice).toBe(1150);
  });

  it('returns basePrice unchanged with zero markup', () => {
    const result = applyMarkup(500, 0);
    expect(result.displayPrice).toBe(500);
    expect(result.basePrice).toBe(500);
  });

  it('handles small values', () => {
    const result = applyMarkup(1, 100);
    // 1 * 2 = 2, ceil(2/5)*5 = 5
    expect(result.displayPrice).toBe(5);
  });
});

describe('getComboDiscountRate', () => {
  it('returns 0.15 for labor + equipment', () => {
    const types = new Set(['labor', 'equipment']);
    expect(getComboDiscountRate(types)).toBe(0.15);
  });

  it('returns 0.15 for labor + equipment_rental', () => {
    const types = new Set(['labor', 'equipment_rental']);
    expect(getComboDiscountRate(types)).toBe(0.15);
  });

  it('returns 0.10 for labor + materials', () => {
    const types = new Set(['labor', 'materials']);
    expect(getComboDiscountRate(types)).toBe(0.10);
  });

  it('returns 0.10 for labor + material', () => {
    const types = new Set(['labor', 'material']);
    expect(getComboDiscountRate(types)).toBe(0.10);
  });

  it('returns 0.10 for equipment + materials', () => {
    const types = new Set(['equipment', 'materials']);
    expect(getComboDiscountRate(types)).toBe(0.10);
  });

  it('returns 0.10 for equipment_rental + material', () => {
    const types = new Set(['equipment_rental', 'material']);
    expect(getComboDiscountRate(types)).toBe(0.10);
  });

  it('returns 0.20 for labor + equipment + materials (all three)', () => {
    const types = new Set(['labor', 'equipment', 'materials']);
    expect(getComboDiscountRate(types)).toBe(0.20);
  });

  it('returns 0.20 for labor + equipment_rental + material', () => {
    const types = new Set(['labor', 'equipment_rental', 'material']);
    expect(getComboDiscountRate(types)).toBe(0.20);
  });

  it('returns 0 for single listing type', () => {
    expect(getComboDiscountRate(new Set(['labor']))).toBe(0);
    expect(getComboDiscountRate(new Set(['equipment']))).toBe(0);
    expect(getComboDiscountRate(new Set(['materials']))).toBe(0);
  });

  it('returns 0 for empty set', () => {
    expect(getComboDiscountRate(new Set())).toBe(0);
  });

  it('returns 0 for unrecognized types', () => {
    expect(getComboDiscountRate(new Set(['unknown', 'other']))).toBe(0);
  });
});

describe('calculateOrderTotals', () => {
  it('computes totals for a single item with no combo discount', () => {
    const items = [
      { baseUnitPrice: 1000, displayUnitPrice: 1150, quantity: 2, listingType: 'labor' },
    ];
    const result = calculateOrderTotals(items);

    expect(result.customerTotal).toBe(2300);
    expect(result.supplierPayout).toBe(2000);
    expect(result.platformMargin).toBe(300);
    expect(result.comboDiscount).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.lineTotal).toBe(2300);
    expect(result.items[0]!.supplierLine).toBe(2000);
  });

  it('applies 15% combo discount for labor + equipment with margin protection', () => {
    const items = [
      { baseUnitPrice: 1000, displayUnitPrice: 1150, quantity: 1, listingType: 'labor' },
      { baseUnitPrice: 500, displayUnitPrice: 560, quantity: 1, listingType: 'equipment_rental' },
    ];
    const result = calculateOrderTotals(items);

    expect(result.comboDiscount).toBeGreaterThan(0);
    // rawCustomerTotal = 1150 + 560 = 1710
    // rawSupplierPayout = 1000 + 500 = 1500
    // grossMargin = 210
    // comboDiscount capped so margin >= 3% of supplierPayout = 45
    // maxDiscount = 210 - 45 = 165
    expect(result.comboDiscount).toBeLessThanOrEqual(165);
    expect(result.supplierPayout).toBe(1500);
    // platformMargin >= 45 (3% of 1500)
    expect(result.platformMargin).toBeGreaterThanOrEqual(45);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.lineTotal).toBe(1150);
    expect(result.items[0]!.supplierLine).toBe(1000);
    expect(result.items[1]!.lineTotal).toBe(560);
    expect(result.items[1]!.supplierLine).toBe(500);
  });

  it('applies 20% combo discount for all three listing types', () => {
    const items = [
      { baseUnitPrice: 1000, displayUnitPrice: 1150, quantity: 1, listingType: 'labor' },
      { baseUnitPrice: 500, displayUnitPrice: 560, quantity: 1, listingType: 'equipment' },
      { baseUnitPrice: 300, displayUnitPrice: 340, quantity: 1, listingType: 'materials' },
    ];
    const result = calculateOrderTotals(items);

    // rawCustomerTotal = 2050, rawSupplierPayout = 1800
    // comboRate = 0.20, raw discount = round(2050*0.20*100)/100 = 410
    // maxDiscount = max(250 - 1800*0.03, 0) = max(196, 0) = 196
    // comboDiscount = min(410, 196) = 196
    expect(result.comboDiscount).toBeGreaterThan(0);
    expect(result.supplierPayout).toBe(1800);
    expect(result.platformMargin).toBeGreaterThanOrEqual(1800 * 0.03);
    expect(result.items).toHaveLength(3);
  });

  it('never lets platform margin drop below 3% of supplierPayout', () => {
    const items = [
      { baseUnitPrice: 900, displayUnitPrice: 1000, quantity: 1, listingType: 'labor' },
      { baseUnitPrice: 900, displayUnitPrice: 1000, quantity: 1, listingType: 'equipment' },
    ];
    const result = calculateOrderTotals(items);

    // rawCustomerTotal = 2000, rawSupplierPayout = 1800
    // grossMargin = 200, comboRate = 0.15
    // raw = round(2000*0.15*100)/100 = 300
    // maxDiscount = max(200 - 1800*0.03, 0) = max(146, 0) = 146
    // comboDiscount = min(300, 146) = 146
    // platformMargin = (2000 - 146) - 1800 = 54
    // 54 / 1800 = 0.03 exactly
    expect(result.platformMargin).toBeGreaterThanOrEqual(result.supplierPayout * 0.03);
    expect(result.comboDiscount).toBe(146);
  });

  it('enriches items with lineTotal and supplierLine', () => {
    const items = [
      { baseUnitPrice: 150, displayUnitPrice: 175, quantity: 3, listingType: 'labor' },
    ];
    const result = calculateOrderTotals(items);

    expect(result.items[0]!.lineTotal).toBe(525);
    expect(result.items[0]!.supplierLine).toBe(450);
    expect(result.items[0]!.baseUnitPrice).toBe(150);
    expect(result.items[0]!.displayUnitPrice).toBe(175);
    expect(result.items[0]!.quantity).toBe(3);
  });
});
