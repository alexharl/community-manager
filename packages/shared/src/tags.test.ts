import { describe, expect, it } from 'vitest';
import './zod-locale';
import { RecipientsSchema } from './emails';
import { normalizeTag, normalizeTags, TAG_MAX_LENGTH } from './tags';

describe('normalizeTag', () => {
  it('trimmt und fasst Leerzeichen zusammen', () => {
    expect(normalizeTag('  Erste   Mannschaft ')).toBe('Erste Mannschaft');
  });

  it('kürzt auf die Maximallänge', () => {
    expect(normalizeTag('x'.repeat(80))).toHaveLength(TAG_MAX_LENGTH);
  });
});

describe('normalizeTags', () => {
  it('entfernt leere Tags und Duplikate unabhängig von Groß-/Kleinschreibung, erste Schreibweise gewinnt', () => {
    expect(normalizeTags(['Vorstand', ' ', 'vorstand', 'Kasse', 'KASSE ', 'Jugend'])).toEqual([
      'Vorstand',
      'Kasse',
      'Jugend',
    ]);
  });
});

describe('RecipientsSchema', () => {
  it('normalisiert auf Kleinschreibung und entfernt Duplikate', () => {
    expect(RecipientsSchema.parse([' Max@Example.org', 'max@example.org', 'b@y.de'])).toEqual([
      'max@example.org',
      'b@y.de',
    ]);
  });

  it('lehnt ungültige Adressen ab', () => {
    const result = RecipientsSchema.safeParse(['ok@example.org', 'kaputt']);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Ungültige E-Mail-Adresse.');
  });
});
