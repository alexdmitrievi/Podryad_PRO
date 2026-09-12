import { describe, it, expect } from 'vitest';
import {
  parseOutreachCallback,
  parseProposalAnswer,
  buildReviewMessage,
  reviewButtons,
} from '../review';

describe('parseOutreachCallback', () => {
  it('parses valid callback_data', () => {
    expect(parseOutreachCallback('outreach:approve:42')).toEqual({ action: 'approve', taskId: 42 });
    expect(parseOutreachCallback('outreach:reject:7')).toEqual({ action: 'reject', taskId: 7 });
    expect(parseOutreachCallback('outreach:edit:100')).toEqual({ action: 'edit', taskId: 100 });
  });

  it('returns null for unrelated callbacks', () => {
    expect(parseOutreachCallback('menu:services')).toBeNull();
    expect(parseOutreachCallback('outreach:delete:1')).toBeNull();
    expect(parseOutreachCallback('outreach:approve:abc')).toBeNull();
    expect(parseOutreachCallback('outreach:approve:1:extra')).toBeNull();
    expect(parseOutreachCallback('')).toBeNull();
  });
});

describe('parseProposalAnswer', () => {
  it('splits subject and body on the separator', () => {
    const r = parseProposalAnswer('Тема письма ||| Текст письма', 'fallback');
    expect(r.subject).toBe('Тема письма');
    expect(r.body).toBe('Текст письма');
  });

  it('keeps fallback subject when LLM returns an empty subject', () => {
    const r = parseProposalAnswer('||| только текст', 'Старая тема');
    expect(r.subject).toBe('Старая тема');
    expect(r.body).toBe('только текст');
  });

  it('treats answer without separator as body, keeping the old subject', () => {
    const r = parseProposalAnswer('просто текст без разделителя', 'Старая тема');
    expect(r.subject).toBe('Старая тема');
    expect(r.body).toBe('просто текст без разделителя');
  });
});

describe('buildReviewMessage', () => {
  const task = { id: 5, subject: 'Предложение', body: 'Тело письма', to_address: 'sales@example.com' };

  it('includes task id, company, recipient and subject', () => {
    const msg = buildReviewMessage(task, 'Acme Corp — Shanghai, China', 'agri_import');
    expect(msg).toContain('#5');
    expect(msg).toContain('Acme Corp');
    expect(msg).toContain('agri_import');
    expect(msg).toContain('sales@example.com');
    expect(msg).toContain('Предложение');
  });

  it('escapes HTML in user-controlled fields', () => {
    const msg = buildReviewMessage({ ...task, subject: '<b>hi</b>' }, '<script>');
    expect(msg).not.toContain('<script>');
    expect(msg).toContain('&lt;script&gt;');
  });

  it('truncates overly long bodies', () => {
    const long = buildReviewMessage({ ...task, body: 'x'.repeat(5000) }, 'Co');
    expect(long.length).toBeLessThan(2500);
    expect(long).toContain('…');
  });
});

describe('reviewButtons', () => {
  it('encodes task id into all three callback_data values', () => {
    const rows = reviewButtons(9);
    expect(rows).toHaveLength(1);
    const datas = rows[0].map((b) => b.data);
    expect(datas).toEqual(['outreach:approve:9', 'outreach:edit:9', 'outreach:reject:9']);
  });
});
