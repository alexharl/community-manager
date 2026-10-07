import { z } from 'zod';
import type { ISODate } from './api';
import { MailConfigPatchSchema, type MailConfig } from './mail-config';
import { TagsSchema } from './tags';

export interface Template {
  id: string;
  name: string;
  tags: string[];
  mail: MailConfig;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const TemplateNameSchema = z.string().trim().min(1, 'Name darf nicht leer sein.').max(100);

export const TemplateCreateSchema = z.object({ name: TemplateNameSchema });
export type TemplateCreate = z.input<typeof TemplateCreateSchema>;

export const TemplatePatchSchema = z.object({
  name: TemplateNameSchema.optional(),
  tags: TagsSchema.optional(),
  mail: MailConfigPatchSchema.optional(),
});
export type TemplatePatch = z.input<typeof TemplatePatchSchema>;
