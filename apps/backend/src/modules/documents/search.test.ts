import { describe, expect, it } from 'vitest';
import { toPrefixTsQuery, toSnippet } from './search';

describe('toSnippet', () => {
  const start = '';
  const end = '';

  it('zerlegt den Ausschnitt in Text und Treffer und kennzeichnet Kürzungen mit „…“', () => {
    const headline = `die ${start}Kassenprüfung${end} findet\nam 15. November statt`;
    expect(toSnippet(headline, 'Protokoll der Sitzung …', '… Ende.')).toEqual([
      { text: '… ', match: false },
      { text: 'die ', match: false },
      { text: 'Kassenprüfung', match: true },
      { text: ' findet am 15. November statt', match: false },
      { text: ' …', match: false },
    ]);
  });

  it('ohne „…“, wenn der Ausschnitt den ganzen Text umfasst', () => {
    const text = 'Kurzer Text zur Kasse';
    expect(toSnippet(`Kurzer Text zur ${start}Kasse${end}`, text, text)).toEqual([
      { text: 'Kurzer Text zur ', match: false },
      { text: 'Kasse', match: true },
    ]);
  });

  it('kein Ausschnitt ohne markierten Treffer (z. B. nur der Titel passt)', () => {
    expect(toSnippet('Anfang des Textes ohne Treffer', 'Anfang', 'Textes')).toBeUndefined();
    expect(toSnippet(null, null, null)).toBeUndefined();
  });
});

describe('toPrefixTsQuery', () => {
  it('verknüpft Wörter als Präfixsuche mit UND', () => {
    expect(toPrefixTsQuery('Vorstand Kasse')).toBe('vorstand:* & kasse:*');
  });

  it('behält Umlaute und Ziffern, entfernt Satz- und Sonderzeichen', () => {
    expect(toPrefixTsQuery("Kassenprüfung am 15.11.! (O'Neil) & | :*")).toBe(
      'kassenprüfung:* & am:* & 15:* & 11:* & o:* & neil:*',
    );
  });

  it('entfernt doppelte Wörter und begrenzt die Anzahl', () => {
    expect(toPrefixTsQuery('a a b')).toBe('a:* & b:*');
    expect(toPrefixTsQuery('1 2 3 4 5 6 7 8 9 10 11 12')?.split(' & ')).toHaveLength(10);
  });

  it('liefert null ohne verwertbare Wörter', () => {
    expect(toPrefixTsQuery('')).toBeNull();
    expect(toPrefixTsQuery('  -- !! ')).toBeNull();
  });
});
