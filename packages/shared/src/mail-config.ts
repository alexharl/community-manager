import { z } from 'zod';
import { RecipientsSchema } from './emails';

/** Mail-Konfiguration einer Vorlage bzw. eines Dokuments (Spezifikation Kap. 5.6). */
export interface MailConfig {
  enabled: boolean;
  accountId: string | null;
  /** Das zuvor gewählte Konto wurde gelöscht → Hinweis „Mail-Konto gelöscht“. */
  accountDeleted: boolean;
  recipients: string[];
}

export const MailConfigPatchSchema = z.object({
  enabled: z.boolean().optional(),
  accountId: z.uuid().nullable().optional(),
  recipients: RecipientsSchema.optional(),
});
export type MailConfigPatch = z.input<typeof MailConfigPatchSchema>;
