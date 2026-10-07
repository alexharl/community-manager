import { describe, expect, it } from 'vitest';
import { toPrefixTsQuery } from './search';

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
