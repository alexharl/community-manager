import { z } from 'zod';
import type { ISODate } from './api';
import { MailConfigPatchSchema, type MailConfig } from './mail-config';
import { TagsSchema } from './tags';

/** Vorlageninhalt (smarte Vorlagen, Spezifikation Kap. 14). */
export interface TemplateContent {
  exists: boolean;
  version: number;
  /** Datumsabhängige Platzhalter → „Neues Dokument“ fragt das Sitzungsdatum ab (S3). */
  requiresDate: boolean;
  placeholders: string[];
  /** Verständliche Fehlermeldung, wenn die Vorlage nicht eingelesen werden kann. */
  error: string | null;
}

export interface Template {
  id: string;
  name: string;
  tags: string[];
  mail: MailConfig;
  content: TemplateContent;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Größe hochgeladener Vorlagen-DOCX (Kap. 14.4). */
export const TEMPLATE_CONTENT_MAX_BYTES = 10 * 1024 * 1024;

export const TemplateNameSchema = z.string().trim().min(1, 'Name darf nicht leer sein.').max(100);

export const TemplateCreateSchema = z.object({ name: TemplateNameSchema });
export type TemplateCreate = z.input<typeof TemplateCreateSchema>;

export const TemplatePatchSchema = z.object({
  name: TemplateNameSchema.optional(),
  tags: TagsSchema.optional(),
  mail: MailConfigPatchSchema.optional(),
});
export type TemplatePatch = z.input<typeof TemplatePatchSchema>;
