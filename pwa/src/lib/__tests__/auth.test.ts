import { describe, it, expect } from 'vitest';
import { normalizePhone, hashPassword, verifyPassword } from '../auth';

describe('normalizePhone', () => {
  it('добавляет 7 к 10-значному номеру', () => {
    expect(normalizePhone('9001234567')).toBe('79001234567');
  });

  it('заменяет 8 на 7 в 11-значном номере', () => {
    expect(normalizePhone('89001234567')).toBe('79001234567');
  });

  it('оставляет 7 в 11-значном номере', () => {
    expect(normalizePhone('79001234567')).toBe('79001234567');
  });

  it('убирает нецифровые символы', () => {
    expect(normalizePhone('+7 (900) 123-45-67')).toBe('79001234567');
  });

  it('возвращает только цифры для коротких номеров', () => {
    expect(normalizePhone('123')).toBe('123');
  });
});

describe('hashPassword / verifyPassword', () => {
  it('хеширует и верифицирует пароль', () => {
    const hash = hashPassword('mypassword123');
    expect(hash.startsWith('scrypt1$')).toBe(true);
    expect(verifyPassword('mypassword123', hash)).toBe(true);
  });

  it('неверный пароль не проходит', () => {
    const hash = hashPassword('correct');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('разные хеши для одинаковых паролей (разные соли)', () => {
    const hash1 = hashPassword('same');
    const hash2 = hashPassword('same');
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword('same', hash1)).toBe(true);
    expect(verifyPassword('same', hash2)).toBe(true);
  });

  it('невалидный формат хеша → false', () => {
    expect(verifyPassword('pass', 'invalid')).toBe(false);
    expect(verifyPassword('pass', 'bcrypt$salt$hash')).toBe(false);
  });
});
