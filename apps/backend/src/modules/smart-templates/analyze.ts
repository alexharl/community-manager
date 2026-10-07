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

interface AstNode {
  type?: string;
  name?: string;
  computed?: boolean;
  [key: string]: unknown;
}

// Abgeleitete Hilfsdaten des Parsers, die dieselben Knoten noch einmal enthalten
const SKIPPED_KEYS = new Set(['type', 'toWatch', 'constant']);

/**
 * Datenfelder eines Ausdrucks aus dessen Syntaxbaum. Anders als `getIdentifiers()` zählen
 * aufgerufene Funktionen wie `tage(…)` mit, Filternamen wie `| oderLeer` dagegen nicht.
 */
function collectFields(node: unknown, fields: Set<string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectFields(child, fields);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const ast = node as AstNode;
  switch (ast.type) {
    case 'Identifier':
      if (ast.name) fields.add(ast.name);
      return;
    case 'FilterExpression':
      collectFields(ast.arguments, fields);
      return;
    case 'MemberExpression':
      collectFields(ast.object, fields);
      if (ast.computed) collectFields(ast.property, fields);
      return;
    case 'Property':
      if (ast.computed) collectFields(ast.key, fields);
      collectFields(ast.value, fields);
      return;
  }
  for (const [key, value] of Object.entries(ast)) {
    if (!SKIPPED_KEYS.has(key)) collectFields(value, fields);
  }
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
        collectFields((parsed as { compiled?: { ast?: unknown } }).compiled?.ast, identifiers);
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
