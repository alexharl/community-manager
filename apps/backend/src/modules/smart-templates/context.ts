import {
  addDays,
  formatDayMonth,
  formatGermanDate,
  formatWeekday,
  toIsoDate,
} from '../../lib/dates';
import type { CalendarEvent, EventSource } from '../events';
import type { LinkRegistry } from './links';

export const EVENTS_UNAVAILABLE =
  'Veranstaltungen konnten nicht geladen werden – das Dokument enthält sie nicht.';

// Schutz vor Tippfehlern wie tage(-600, 600)
const MAX_DAYS = 366;

interface TemplateDataInput {
  referenceDate: Date;
  verein: string;
  titel: string;
  vorlage: string;
  events: EventSource | null;
  links: LinkRegistry;
  /** Sammelt Hinweise für die Oberfläche (z. B. Veranstaltungen nicht erreichbar). */
  warnings: string[];
  onEventsError?: (error: unknown) => void;
}

/**
 * Daten für die Platzhalter (Spezifikation Kap. 14.2). `tage(von, bis)` lädt die
 * Veranstaltungen asynchron für genau diesen Zeitraum (je Zeitraum nur einmal).
 */
export function buildTemplateData(input: TemplateDataInput) {
  const { referenceDate, links } = input;
  const cache = new Map<string, Promise<CalendarEvent[]>>();

  function loadEvents(from: string, to: string): Promise<CalendarEvent[]> {
    if (!input.events) return Promise.resolve([]);
    const key = `${from}|${to}`;
    let pending = cache.get(key);
    if (!pending) {
      pending = input.events.listEvents(from, to).catch((error: unknown) => {
        input.onEventsError?.(error);
        if (!input.warnings.includes(EVENTS_UNAVAILABLE)) input.warnings.push(EVENTS_UNAVAILABLE);
        return [];
      });
      cache.set(key, pending);
    }
    return pending;
  }

  const dayFields = (date: Date) => ({
    wochentag: formatWeekday(date),
    datum: formatDayMonth(date),
    datumLang: formatGermanDate(date),
  });

  return {
    verein: input.verein,
    titel: input.titel,
    vorlage: input.vorlage,
    ...dayFields(referenceDate),
    tage: async (from: unknown, to: unknown) => {
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        throw new Error('tage(von, bis) erwartet zwei ganze Zahlen, z. B. tage(-6, -1)');
      }
      const start = from as number;
      const end = to as number;
      if (Math.abs(end - start) > MAX_DAYS) throw new Error(`tage(): höchstens ${MAX_DAYS} Tage`);

      const step = start <= end ? 1 : -1;
      const dates: Date[] = [];
      for (let offset = start; step > 0 ? offset <= end : offset >= end; offset += step) {
        dates.push(addDays(referenceDate, offset));
      }
      const isoDates = dates.map(toIsoDate);
      const sorted = [...isoDates].sort();
      const events = await loadEvents(sorted[0]!, sorted.at(-1)!);

      return dates.map((date, index) => ({
        ...dayFields(date),
        veranstaltungen: events
          .filter((event) => event.date === isoDates[index])
          .map((event) => ({
            titel: event.title,
            uhrzeit: event.time ?? '',
            webseite: event.url ? links.add(event.url, 'Webseite') : '',
          })),
      }));
    },
  };
}
