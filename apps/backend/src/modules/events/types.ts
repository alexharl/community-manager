/** Eine Veranstaltung, unabhängig von der Datenquelle (Spezifikation Kap. 14.3). */
export interface CalendarEvent {
  title: string;
  /** JJJJ-MM-TT (Starttag) */
  date: string;
  /** „HH:MM“ oder `null` bei ganztägigen Veranstaltungen */
  time: string | null;
  url: string | null;
}

/** Austauschbare Veranstaltungsquelle (Entscheidung S7). */
export interface EventSource {
  /** Alle Veranstaltungen mit Starttag zwischen `from` und `to` (JJJJ-MM-TT, inklusive), sortiert. */
  listEvents(from: string, to: string): Promise<CalendarEvent[]>;
}
