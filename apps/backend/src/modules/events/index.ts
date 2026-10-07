import type { Config } from '../../config';
import type { EventSource } from './types';
import { WpFullCalendarSource } from './wp-fullcalendar';

export type { CalendarEvent, EventSource } from './types';

/** Veranstaltungsquelle laut Konfiguration; `null` = keine (Listen bleiben leer). */
export function createEventSource(config: Config['events']): EventSource | null {
  switch (config.source) {
    case 'wp-fullcalendar':
      return config.url ? new WpFullCalendarSource(config.url) : null;
    default:
      return null;
  }
}
