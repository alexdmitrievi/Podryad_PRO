import { describe, it, expect } from 'vitest';
import { escapeMarkdownV2 } from '../telegram';
import { escapeMaxMarkdown } from '../max';

describe('escapeMarkdownV2', () => {
  it('escapes special characters', () => {
    const input = 'Hello_World *bold* [link](url) ~strike~ `code` #tag +1 -2 =3 |4 {5} .6 !7 >quote';
    const escaped = escapeMarkdownV2(input);
    // Each special char should be preceded by backslash
    expect(escaped).not.toBe(input);
    expect(escaped).toContain('\\_');
    expect(escaped).toContain('\\*');
    expect(escaped).toContain('\\[');
    expect(escaped).toContain('\\]');
    expect(escaped).toContain('\\(');
    expect(escaped).toContain('\\)');
    expect(escaped).toContain('\\~');
    expect(escaped).toContain('\\`');
    expect(escaped).toContain('\\>');
    expect(escaped).toContain('\\#');
    expect(escaped).toContain('\\+');
    expect(escaped).toContain('\\-');
    expect(escaped).toContain('\\=');
    expect(escaped).toContain('\\|');
    expect(escaped).toContain('\\{');
    expect(escaped).toContain('\\}');
    expect(escaped).toContain('\\.');
    expect(escaped).toContain('\\!');
  });

  it('does not escape plain text', () => {
    const input = 'Hello World 123';
    expect(escapeMarkdownV2(input)).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(escapeMarkdownV2('')).toBe('');
  });

  it('escapes typical AI-generated russian text', () => {
    const input = 'Стоимость: 5000 руб. (цена за час). За подробностями пишите @admin, #заказ!';
    const escaped = escapeMarkdownV2(input);
    expect(escaped).toContain('\\.');
    expect(escaped).toContain('\\(');
    expect(escaped).toContain('\\)');
    expect(escaped).toContain('\\#');
    expect(escaped).toContain('\\!');
  });
});

describe('escapeMaxMarkdown', () => {
  it('behaves identically to escapeMarkdownV2', () => {
    const input = 'Price: $100 [click](url) *bold* _italic_ ~strike~';
    expect(escapeMaxMarkdown(input)).toBe(escapeMarkdownV2(input));
  });

  it('escapeMaxMarkdown works', () => {
    expect(escapeMaxMarkdown('*text*')).toBe('\\*text\\*');
  });
});
