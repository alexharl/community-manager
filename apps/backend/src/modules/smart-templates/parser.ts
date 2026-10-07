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

/**
 * Ausdrucks-Parser der Platzhalter (Spezifikation Kap. 14.2) mit eigenem Filter:
 * `liste | oderLeer` – die Liste oder, wenn sie leer ist, ein einzelner leerer Eintrag (S5).
 */
export const templateParser = expressionParser.configure({
  filters: {
    oderLeer: (list: unknown) => (Array.isArray(list) && list.length > 0 ? list : [EMPTY_ENTRY]),
  },
});
