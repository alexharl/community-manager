import { z } from 'zod';
import type { CalendarEvent, EventSource } from './types';

const RawEventSchema = z.object({
  title: z.string(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  url: z.string().nullish(),
  event_id: z.union([z.number(), z.string()]).nullish(),
  allDay: z.boolean().nullish(),
});
type RawEvent = z.infer<typeof RawEventSchema>;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
};

/** WordPress liefert Titel teils mit HTML-Entities (z. B. „&#8211;“). */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Alle Monate („JJJJ-MM“), die der Zeitraum berührt. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const end = to.slice(0, 7);
  for (;;) {
    const current = `${year}-${pad(month)}`;
    months.push(current);
    if (current >= end) return months;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

function toCalendarEvent(raw: RawEvent): CalendarEvent {
  const time = raw.allDay ? null : raw.start.slice(11, 16) || null;
  const url = raw.url && /^https?:\/\//i.test(raw.url) ? raw.url : null;
  return { title: decodeHtmlEntities(raw.title).trim(), date: raw.start.slice(0, 10), time, url };
}

/**
 * WordPress-Plugin „WP FullCalendar“ (Kap. 14.3). Das Plugin liefert stets die Monatsansicht
 * des angefragten Monats – daher je Monat abfragen, lokal filtern und entdoppeln.
 */
export class WpFullCalendarSource implements EventSource {
  private readonly url: string;
  private readonly fetchFn: typeof fetch;

  constructor(url: string, fetchFn: typeof fetch = fetch) {
    this.url = url;
    this.fetchFn = fetchFn;
  }

  async listEvents(from: string, to: string): Promise<CalendarEvent[]> {
    const batches = await Promise.all(
      monthsBetween(from, to).map((month) => this.fetchMonth(month)),
    );
    const seen = new Set<string>();
    const events: CalendarEvent[] = [];
    for (const raw of batches.flat()) {
      const event = toCalendarEvent(raw);
      if (event.date < from || event.date > to) continue;
      const key = `${raw.event_id ?? raw.url ?? raw.title}@${raw.start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(event);
    }
    return events.sort((a, b) =>
      `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`),
    );
  }

  private async fetchMonth(month: string): Promise<RawEvent[]> {
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year!, monthNumber!, 0).getDate();
    const params = new URLSearchParams({
      action: 'WP_FullCalendar',
      type: 'event',
      full: '1',
      long_events: '1',
      start: `${month}-01`,
      end: `${month}-${pad(lastDay)}`,
    });
    const response = await this.fetchFn(`${this.url}?${params}`, {
      headers: { Accept: 'application/json, text/html' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Veranstaltungen: HTTP ${response.status}`);
    // Antwort ist JSON, aber als text/html ausgeliefert
    const data: unknown = JSON.parse(await response.text());
    if (!Array.isArray(data)) throw new Error('Veranstaltungen: unerwartetes Antwortformat');
    return data.flatMap((entry) => {
      const result = RawEventSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  }
}
