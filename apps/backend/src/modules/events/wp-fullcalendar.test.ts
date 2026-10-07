import { describe, expect, it, vi } from 'vitest';
import { decodeHtmlEntities, monthsBetween, WpFullCalendarSource } from './wp-fullcalendar';

const event = (start: string, title: string, id: number, extra: object = {}) => ({
  title,
  start,
  end: start,
  url: `https://example.org/events/${id}/`,
  event_id: id,
  allDay: false,
  color: '#434343',
  ...extra,
});

/** Simuliert das Plugin: liefert je Monat (aus `start`) eine feste Monatsansicht. */
function fakeFetch(views: Record<string, object[]>) {
  return vi.fn(async (url: string | URL | Request) => {
    const month = new URL(String(url)).searchParams.get('start')!.slice(0, 7);
    return new Response(JSON.stringify(views[month] ?? []), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    });
  });
}

describe('monthsBetween', () => {
  it('liefert alle berührten Monate, auch über den Jahreswechsel', () => {
    expect(monthsBetween('2026-10-01', '2026-10-14')).toEqual(['2026-10']);
    expect(monthsBetween('2026-12-28', '2027-01-04')).toEqual(['2026-12', '2027-01']);
  });
});

describe('decodeHtmlEntities', () => {
  it('dekodiert numerische und benannte Entities', () => {
    expect(decodeHtmlEntities('Rock &#8211; Pop &amp; &quot;Jazz&quot; &#x2013; &hellip;')).toBe(
      'Rock – Pop & "Jazz" – …',
    );
  });
});

describe('WpFullCalendarSource', () => {
  it('fragt je Monat ab, filtert auf den Zeitraum, entdoppelt und sortiert', async () => {
    // Oktober- und November-Ansicht überlappen (Monatsraster) → 29.10. kommt doppelt
    const fetchFn = fakeFetch({
      '2026-10': [
        event('2026-10-29T20:00:00', 'Los Fastidios', 3),
        event('2026-10-27T19:00:00', 'Kneipenabend', 2),
        event('2026-09-29T20:00:00', 'Außerhalb', 1),
      ],
      '2026-11': [
        event('2026-10-29T20:00:00', 'Los Fastidios', 3),
        event('2026-11-02T00:00:00', 'Ganztags', 4, { allDay: true, url: 'kein-link' }),
      ],
    });
    const source = new WpFullCalendarSource('https://example.org/wp-admin/admin-ajax.php', fetchFn);

    const events = await source.listEvents('2026-10-27', '2026-11-03');

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(String(fetchFn.mock.calls[0]![0]));
    expect(Object.fromEntries(firstUrl.searchParams)).toMatchObject({
      action: 'WP_FullCalendar',
      start: '2026-10-01',
      end: '2026-10-31',
    });
    expect(events).toEqual([
      {
        title: 'Kneipenabend',
        date: '2026-10-27',
        time: '19:00',
        url: 'https://example.org/events/2/',
      },
      {
        title: 'Los Fastidios',
        date: '2026-10-29',
        time: '20:00',
        url: 'https://example.org/events/3/',
      },
      { title: 'Ganztags', date: '2026-11-02', time: null, url: null },
    ]);
  });

  it('meldet HTTP-Fehler und unerwartete Antworten', async () => {
    const failing = new WpFullCalendarSource(
      'https://example.org/x',
      vi.fn(async () => new Response('Fehler', { status: 500 })),
    );
    await expect(failing.listEvents('2026-10-01', '2026-10-02')).rejects.toThrow('HTTP 500');

    const odd = new WpFullCalendarSource(
      'https://example.org/x',
      vi.fn(async () => new Response('{"kein":"array"}')),
    );
    await expect(odd.listEvents('2026-10-01', '2026-10-02')).rejects.toThrow('Antwortformat');
  });
});
