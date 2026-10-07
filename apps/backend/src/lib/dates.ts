const pad = (value: number) => String(value).padStart(2, '0');
const weekdayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long' });

/** JJJJ-MM-TT → Datum (lokale Mitternacht). */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

/** Datum → JJJJ-MM-TT (lokale Zeit). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Heutiges Datum, lokale Mitternacht. */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** „07.10“ (Entscheidung S6). */
export const formatDayMonth = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;

/** „07.10.2026“ */
export const formatGermanDate = (date: Date) => `${formatDayMonth(date)}.${date.getFullYear()}`;

/** „Mittwoch“ */
export const formatWeekday = (date: Date) => weekdayFormat.format(date);
