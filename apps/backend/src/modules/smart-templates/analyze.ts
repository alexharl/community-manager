import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { describeTemplateError } from './errors';
import { DATE_IDENTIFIERS, KNOWN_IDENTIFIERS, templateParser } from './parser';

export interface TemplateAnalysis {
  /** Verwendete Platzhalter-Ausdrücke, z. B. „tage(-6, -1)“, „titel“. */
  placeholders: string[];
  /** Datumsabhängig → „Neues Dokument“ fragt das Sitzungsdatum ab (S3). */
  requiresDate: boolean;
  /** Verständliche Meldung bei Syntaxfehlern oder unbekannten Platzhaltern. */
  error: string | null;
}

/**
 * Liest eine Vorlage ein, ohne sie zu befüllen (Kap. 14.4, Schritt 3). docxtemplater ruft den
 * Parser für jedes Tag auf – darüber werden Platzhalter und verwendete Felder gesammelt.
 */
export function analyzeTemplate(buffer: Buffer): TemplateAnalysis {
  const placeholders = new Set<string>();
  const identifiers = new Set<string>();

  try {
    new Docxtemplater(new PizZip(buffer), {
      paragraphLoop: true,
      parser: (tag) => {
        const parsed = templateParser(tag);
        if (tag.trim()) placeholders.add(tag.trim());
        for (const identifier of parsed.getIdentifiers()) identifiers.add(identifier);
        return parsed;
      },
    });
  } catch (error) {
    return {
      placeholders: [...placeholders],
      requiresDate: false,
      error: describeTemplateError(error),
    };
  }

  const unknown = [...identifiers].filter((identifier) => !KNOWN_IDENTIFIERS.has(identifier));
  return {
    placeholders: [...placeholders],
    requiresDate: [...identifiers].some((identifier) => DATE_IDENTIFIERS.has(identifier)),
    error: unknown.length
      ? `Unbekannte Platzhalter: ${unknown.map((name) => `„${name}“`).join(', ')} – sie bleiben leer.`
      : null,
  };
}
