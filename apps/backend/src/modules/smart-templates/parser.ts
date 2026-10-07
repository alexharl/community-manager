import expressionParser from 'docxtemplater/expressions.js';

/** Datenfelder, die die App bereitstellt – alles andere ist ein Tippfehler. */
export const KNOWN_IDENTIFIERS = new Set([
  // Dokument
  'verein',
  'titel',
  'vorlage',
  // Sitzungsdatum bzw. je Tag
  'datum',
  'datumLang',
  'wochentag',
  'tage',
  'veranstaltungen',
  // je Veranstaltung
  'uhrzeit',
  'webseite',
]);

/** Platzhalter, die ein Sitzungsdatum brauchen (Entscheidung S3). */
export const DATE_IDENTIFIERS = new Set(['tage', 'datum', 'datumLang', 'wochentag']);

/**
 * Leerer Eintrag für `oderLeer`: Alle Felder ausdrücklich leer. Sonst würde z. B. `{titel}`
 * im leeren Veranstaltungspunkt auf den Dokumenttitel im übergeordneten Bereich zurückfallen.
 */
const EMPTY_ENTRY = Object.freeze(
  Object.fromEntries(
    [...KNOWN_IDENTIFIERS].filter((name) => name !== 'tage').map((name) => [name, '']),
  ),
);

/** Filter auch auf asynchrone Werte anwenden – `tage()` liefert ein Promise. */
const forValue =
  (apply: (value: unknown) => unknown) =>
  (value: unknown): unknown =>
    value instanceof Promise ? value.then(apply) : apply(value);

const hasEvents = (day: unknown) => {
  const events = (day as { veranstaltungen?: unknown } | null)?.veranstaltungen;
  return Array.isArray(events) && events.length > 0;
};

/**
 * Ausdrucks-Parser der Platzhalter (Spezifikation Kap. 14.2) mit eigenen Filtern:
 * - `liste | oderLeer` – die Liste oder, wenn sie leer ist, ein einzelner leerer Eintrag (S5)
 * - `tage(…) | mitVeranstaltungen` – nur Tage mit Veranstaltungen, z. B. für den Rückblick (S9)
 */
export const templateParser = expressionParser.configure({
  filters: {
    oderLeer: forValue((list) => (Array.isArray(list) && list.length > 0 ? list : [EMPTY_ENTRY])),
    mitVeranstaltungen: forValue((days) => (Array.isArray(days) ? days.filter(hasEvents) : days)),
  },
});
