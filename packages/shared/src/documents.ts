import { z } from 'zod';
import type { ISODate } from './api';
import { MailConfigPatchSchema, type MailConfig } from './mail-config';
import { TagsSchema } from './tags';

export interface DocumentSummary {
  id: string;
  title: string;
  tags: string[];
  /** Snapshot des Vorlagennamens; `null` = leeres Dokument. */
  templateName: string | null;
  /** Vorlage wurde nach dem Anlegen gelöscht. */
  templateDeleted: boolean;
  createdAt: ISODate;
  /** Bearbeitungsdatum: letzte inhaltliche Änderung. */
  editedAt: ISODate;
}

export interface PdfInfo {
  filename: string;
  /** Version, aus der die PDF erzeugt wurde. */
  version: number;
  createdAt: ISODate;
  /** PDF entspricht der aktuellen Version. */
  current: boolean;
}

export interface DocumentDetail extends DocumentSummary {
  templateId: string | null;
  version: number;
  storagePath: string;
  docxFilename: string;
  pdf: PdfInfo | null;
  mail: MailConfig;
  updatedAt: ISODate;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type EditorMode = 'edit' | 'view';

/** Antwort von `GET /documents/:id/editor-config` (Spezifikation Kap. 5.2). */
export interface EditorConfigResponse {
  documentServerUrl: string;
  /** Signierte ONLYOFFICE-Konfiguration inkl. `token`. */
  config: Record<string, unknown>;
}

export const DocumentCreateSchema = z.object({
  templateId: z.uuid().nullable(),
  /** Sitzungsdatum (JJJJ-MM-TT) für datumsabhängige Vorlagen; Standard: heute. */
  referenceDate: z.iso.date('Ungültiges Datum.').optional(),
});
export type DocumentCreate = z.input<typeof DocumentCreateSchema>;

/** Antwort beim Anlegen: das Dokument und ggf. Hinweise (z. B. Veranstaltungen nicht erreichbar). */
export interface DocumentCreateResult extends DocumentDetail {
  warnings: string[];
}

export const DocumentTitleSchema = z.string().trim().min(1, 'Titel darf nicht leer sein.').max(200);

export const DocumentPatchSchema = z.object({
  title: DocumentTitleSchema.optional(),
  tags: TagsSchema.optional(),
  mail: MailConfigPatchSchema.optional(),
});
export type DocumentPatch = z.input<typeof DocumentPatchSchema>;
