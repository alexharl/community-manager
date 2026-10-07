const MAX_TERMS = 10;

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
