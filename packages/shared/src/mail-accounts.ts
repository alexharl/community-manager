import { z } from 'zod';
import { emptyToNull } from './normalize';

export interface MailAccount {
  id: string;
  label: string | null;
  /** label ?? smtpUser */
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromAddress: string | null;
  fromName: string | null;
  /** fromAddress ?? smtpUser */
  effectiveFromAddress: string;
  /** Anzahl der Vorlagen, die dieses Konto verwenden (Hinweis beim Löschen). */
  templateCount: number;
}

export interface MailAccountInput {
  label?: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  /** Pflicht beim Anlegen; beim Bearbeiten leer = unverändert. */
  smtpPass?: string;
  fromAddress?: string | null;
  fromName?: string | null;
}

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable().optional());

const portMessage = 'Port muss zwischen 1 und 65535 liegen.';

export const MailAccountInputSchema = z.object({
  label: optionalText(100),
  smtpHost: z.string().trim().min(1, 'SMTP-Host fehlt.').max(255),
  smtpPort: z.coerce.number<unknown>().int(portMessage).min(1, portMessage).max(65535, portMessage),
  smtpUser: z.string().trim().min(1, 'SMTP-Benutzer fehlt.').max(255),
  smtpPass: z.string().max(500).optional(),
  fromAddress: z.preprocess(
    emptyToNull,
    z.email('Ungültige E-Mail-Adresse.').max(255).nullable().optional(),
  ),
  fromName: optionalText(100),
});

/** Verbindungstest: wie die Eingabe, bei bestehendem Konto mit `id` (Passwort darf dann fehlen). */
export const MailAccountVerifySchema = MailAccountInputSchema.extend({
  id: z.uuid().optional(),
});
