import type { SnippetPart } from '@cm/shared';

const MAX_TERMS = 10;

// Treffer-Markierung im Ergebnis von ts_headline: Zeichen aus dem Unicode-Privatbereich,
// die in Dokumenttexten nicht vorkommen – so bleibt der Text reiner Text (kein HTML)
const MATCH_START = '';
const MATCH_END = '';
const MARKERS = /[]/;

/** Optionen für `ts_headline` (Kap. 5.5): bis zu zwei Fundstellen mit je 8–15 Wörtern. */
export const HEADLINE_OPTIONS = `StartSel=${MATCH_START}, StopSel=${MATCH_END}, MaxFragments=2, MinWords=8, MaxWords=15, FragmentDelimiter=" … "`;

// Länge von Anfang und Ende des Inhalts, gegen die ein Ausschnitt verglichen wird
export const CONTENT_EDGE_LENGTH = 300;

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Suchausschnitt aus dem Ergebnis von `ts_headline` (Kap. 5.5). Ohne markierten Treffer
 * (nur der Titel passt oder nur Stoppwörter) gibt es keinen Ausschnitt. „…“ zeigt an, dass
 * der Ausschnitt nicht am Anfang bzw. Ende des Dokuments liegt.
 */
export function toSnippet(
  headline: string | null,
  contentStart: string | null,
  contentEnd: string | null,
): SnippetPart[] | undefined {
  if (!headline?.includes(MATCH_START)) return undefined;
  const text = normalize(headline);
  const parts: SnippetPart[] = text
    .split(MARKERS)
    .flatMap((chunk, index) => (chunk ? [{ text: chunk, match: index % 2 === 1 }] : []));

  const plain = text.replace(new RegExp(MARKERS.source, 'g'), '');
  const edge = Math.min(plain.length, 30);
  if (!normalize(contentStart ?? '').startsWith(plain.slice(0, edge))) {
    parts.unshift({ text: '… ', match: false });
  }
  if (!normalize(contentEnd ?? '').endsWith(plain.slice(-edge))) {
    parts.push({ text: ' …', match: false });
  }
  return parts;
}

/**
 * Wandelt eine Freitexteingabe in eine Präfixsuche für `to_tsquery` (Kap. 5.5):
 * „Vorstand Kasse“ → `vorstand:* & kasse:*`. Es bleiben nur Buchstaben und Ziffern übrig,
 * daher kann die Eingabe die tsquery-Syntax nicht verletzen. Keine Wörter → `null`.
 */
export function toPrefixTsQuery(input: string): string | null {
  const words = input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = [...new Set(words)].slice(0, MAX_TERMS);
  return terms.length > 0 ? terms.map((term) => `${term}:*`).join(' & ') : null;
}
