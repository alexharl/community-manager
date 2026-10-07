import type { DocumentSummary } from '@cm/shared';

/** „Vorstandssitzung“, „Vorstandssitzung (Vorlage gelöscht)“ oder „Leeres Dokument“ (Kap. 7.4.8). */
export function templateLabel(doc: Pick<DocumentSummary, 'templateName' | 'templateDeleted'>): string {
  if (!doc.templateName) return 'Leeres Dokument';
  return doc.templateDeleted ? `${doc.templateName} (Vorlage gelöscht)` : doc.templateName;
}
