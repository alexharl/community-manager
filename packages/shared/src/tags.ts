import { z } from 'zod';

export const TAG_MAX_LENGTH = 50;

/** Trimmt, fasst Leerzeichen zusammen und kürzt auf die Maximallänge (Spezifikation Kap. 4.3). */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, TAG_MAX_LENGTH).trim();
}

/** Normalisiert alle Tags, verwirft leere und entfernt Duplikate ohne Rücksicht auf Groß-/Kleinschreibung. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

export const TagsSchema = z.array(z.string()).max(100).transform(normalizeTags);
