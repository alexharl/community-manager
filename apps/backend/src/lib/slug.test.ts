import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('schreibt Umlaute um und ersetzt Sonderzeichen', () => {
    expect(slugify('Vorstandssitzung 07.10.2026')).toBe('vorstandssitzung-07-10-2026');
    expect(slugify('Übergabe: Größe & Maß')).toBe('uebergabe-groesse-mass');
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('kürzt ohne Bindestrich am Ende und hat einen Fallback', () => {
    // 59 × a + „-bcd“: der Schnitt bei 60 trifft den Bindestrich, der dann entfällt
    expect(slugify('a'.repeat(59) + ' bcd', 60)).toBe('a'.repeat(59));
    expect(slugify('a'.repeat(58) + ' bcd', 60)).toBe('a'.repeat(58) + '-b');
    expect(slugify('!!!')).toBe('dokument');
  });
});
