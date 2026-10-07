/** Für optionale Textfelder: trimmt Strings, leere Eingaben werden zu `null`. */
export function emptyToNull(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
