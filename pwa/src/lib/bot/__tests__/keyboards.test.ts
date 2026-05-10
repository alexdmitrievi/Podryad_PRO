// Bot keyboards tests
import { describe, it, expect } from 'vitest';
import {
  mainMenuButtons,
  mainMenuB2bButtons,
  customerTypeButtons,
  regionButtons,
  serviceSelectionButtons,
  areaButtons,
  districtButtons,
  whenButtons,
  confirmButtons,
  postOrderButtons,
  orderCardButtons,
  materialsMenuButtons,
  gradeButtons,
  materialQtyButtons,
  referralButtons,
  backToHomeButton,
} from '@/lib/bot/keyboards';

describe('keyboards — main menus', () => {
  it('mainMenuButtons returns array', () => {
    const kb = mainMenuButtons();
    expect(Array.isArray(kb)).toBe(true);
    expect(kb.length).toBeGreaterThanOrEqual(4);
  });

  it('mainMenuB2bButtons returns array', () => {
    const kb = mainMenuB2bButtons();
    expect(Array.isArray(kb)).toBe(true);
    expect(kb.length).toBeGreaterThanOrEqual(4);
  });

  it('mainMenuButtons includes materials button', () => {
    const kb = mainMenuButtons();
    const all = kb.flat();
    const matBtn = all.find((b) => b.text?.includes('Материалы'));
    expect(matBtn).toBeDefined();
    expect(matBtn!.callback_data).toBe('menu:materials');
  });

  it('mainMenuB2bButtons has materials first', () => {
    const kb = mainMenuB2bButtons();
    const firstRow = kb[0]!;
    expect(firstRow[0]!.text).toContain('Материалы');
  });

  it('mainMenuButtons shows current region in toggle button', () => {
    const kb = mainMenuButtons('novosibirsk');
    const all = kb.flat();
    const regionBtn = all.find((b) => b.callback_data === 'menu:region');
    expect(regionBtn).toBeDefined();
    expect(regionBtn!.text).toContain('Новосибирск');
  });
});

describe('keyboards — customer type & region', () => {
  it('customerTypeButtons has B2C and B2B options', () => {
    const kb = customerTypeButtons();
    expect(kb).toHaveLength(2);
    expect(kb[0]![0]!.callback_data).toBe('ctype:b2c');
    expect(kb[1]![0]!.callback_data).toBe('ctype:b2b');
  });

  it('regionButtons has Omsk and Novosibirsk + nav', () => {
    const kb = regionButtons();
    expect(kb.length).toBeGreaterThanOrEqual(2);
    expect(kb[0]![0]!.callback_data).toBe('region:omsk');
    expect(kb[0]![1]!.callback_data).toBe('region:novosibirsk');
  });
});

describe('keyboards — services', () => {
  it('serviceSelectionButtons has services', () => {
    const kb = serviceSelectionButtons();
    const all = kb.flat();
    expect(all.length).toBeGreaterThanOrEqual(9);
    expect(all.some((b) => b.callback_data === 'svc:lawn_mowing')).toBe(true);
    expect(all.some((b) => b.callback_data === 'svc:pool_cleaning')).toBe(true);
  });

  it('areaButtons generates correct callback_data', () => {
    const kb = areaButtons('lawn_mowing');
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'area:lawn_mowing:5')).toBe(true);
    expect(all.some((b) => b.callback_data === 'area:lawn_mowing:30')).toBe(true);
  });

  it('districtButtons has 6+ districts', () => {
    const kb = districtButtons();
    const all = kb.flat();
    expect(all.filter((b) => (b.callback_data ?? '').startsWith('district:')).length).toBe(6);
  });

  it('whenButtons has 4+ options', () => {
    const kb = whenButtons();
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'when:today')).toBe(true);
    expect(all.some((b) => b.callback_data === 'when:weekend')).toBe(true);
  });

  it('confirmButtons has confirm + cancel', () => {
    const kb = confirmButtons();
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'confirm:yes')).toBe(true);
    expect(all.some((b) => b.callback_data === 'confirm:cancel')).toBe(true);
  });

  it('postOrderButtons has my_orders + nav home', () => {
    const kb = postOrderButtons();
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'menu:my_orders')).toBe(true);
    expect(all.some((b) => b.callback_data === 'nav:home')).toBe(true);
  });
});

describe('keyboards — materials', () => {
  it('materialsMenuButtons has 5 materials + back', () => {
    const kb = materialsMenuButtons();
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'mat:concrete')).toBe(true);
    expect(all.some((b) => b.callback_data === 'mat:crushed_stone')).toBe(true);
    expect(all.some((b) => b.callback_data === 'mat:sand')).toBe(true);
    expect(all.some((b) => b.callback_data === 'mat:cement')).toBe(true);
    expect(all.some((b) => b.callback_data === 'mat:brick')).toBe(true);
  });

  it('gradeButtons: concrete has 7 normal grades + "не знаю"', () => {
    const kb = gradeButtons('concrete');
    const all = kb.flat();
    // 7 marks (M100..M400) + 1 "unknown" fallback
    expect(all.filter((b) => (b.callback_data ?? '').startsWith('grade:concrete:')).length).toBe(8);
  });

  it('gradeButtons: sand has 4 grades', () => {
    const kb = gradeButtons('sand');
    const all = kb.flat();
    expect(all.filter((b) => (b.callback_data ?? '').startsWith('grade:sand:')).length).toBe(4);
  });

  it('materialQtyButtons: м³ has correct options', () => {
    const kb = materialQtyButtons('м³');
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'qty:3')).toBe(true);
    expect(all.some((b) => b.callback_data === 'qty:10')).toBe(true);
  });

  it('materialQtyButtons: т has correct options', () => {
    const kb = materialQtyButtons('т');
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'qty:5')).toBe(true);
    expect(all.some((b) => b.callback_data === 'qty:40')).toBe(true);
  });

  it('materialQtyButtons: шт has correct options', () => {
    const kb = materialQtyButtons('шт');
    const all = kb.flat();
    expect(all.some((b) => b.callback_data === 'qty:50')).toBe(true);
  });
});

describe('keyboards — other', () => {
  it('orderCardButtons has repeat + cancel for new status', () => {
    const kb = orderCardButtons('lead-123', 'new');
    const all = kb.flat();
    expect(all.some((b) => b.callback_data?.startsWith('order:lead-123:repeat'))).toBe(true);
    expect(all.some((b) => b.callback_data?.startsWith('order:lead-123:cancel'))).toBe(true);
  });

  it('referralButtons has 2 rows', () => {
    const kb = referralButtons();
    expect(kb.length).toBeGreaterThanOrEqual(2);
  });

  it('backToHomeButton has one row with back + home navigation', () => {
    const kb = backToHomeButton();
    expect(kb).toHaveLength(1);
    const codes = kb[0]!.map((b) => b.callback_data);
    expect(codes).toContain('nav:back');
    expect(codes).toContain('nav:home');
  });
});
