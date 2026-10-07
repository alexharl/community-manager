import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDayMonth,
  formatGermanDate,
  formatWeekday,
  parseIsoDate,
  toIsoDate,
} from './dates';

describe('Datumsfunktionen', () => {
  it('liest und schreibt JJJJ-MM-TT ohne Zeitzonenversatz', () => {
    const date = parseIsoDate('2026-10-07');
    expect(date.getDate()).toBe(7);
    expect(toIsoDate(date)).toBe('2026-10-07');
  });

  it('rechnet über Monats- und Jahresgrenzen', () => {
    expect(toIsoDate(addDays(parseIsoDate('2026-10-01'), -6))).toBe('2026-09-25');
    expect(toIsoDate(addDays(parseIsoDate('2026-12-29'), 7))).toBe('2027-01-05');
  });

  it('formatiert deutsch', () => {
    const date = parseIsoDate('2026-10-07');
    expect(formatDayMonth(date)).toBe('07.10');
    expect(formatGermanDate(date)).toBe('07.10.2026');
    expect(formatWeekday(date)).toBe('Mittwoch');
  });
});
