import type { MailConfig, MailConfigPatchSchema } from '@cm/shared';
import type { z } from 'zod';
import type { Db } from '../db/db';
import { AppError } from './errors';

/** Spalten der Mail-Konfiguration – identisch in `templates` und `documents`. */
interface MailColumns {
  mail_enabled: boolean;
  mail_account_id: string | null;
  mail_account_deleted: boolean;
  mail_recipients: string[];
}

export function toMailConfig(row: MailColumns): MailConfig {
  return {
    enabled: row.mail_enabled,
    accountId: row.mail_account_id,
    accountDeleted: row.mail_account_deleted,
    recipients: row.mail_recipients,
  };
}

/** Übersetzt einen Patch in Spaltenwerte; ein neu gewähltes Konto hebt „Mail-Konto gelöscht“ auf. */
export function mailConfigColumns(
  patch: z.output<typeof MailConfigPatchSchema> | undefined,
): Partial<MailColumns> {
  if (!patch) return {};
  return {
    ...(patch.enabled !== undefined ? { mail_enabled: patch.enabled } : {}),
    ...(patch.accountId !== undefined
      ? { mail_account_id: patch.accountId, mail_account_deleted: false }
      : {}),
    ...(patch.recipients !== undefined ? { mail_recipients: patch.recipients } : {}),
  };
}

/** Verhindert einen FK-Fehler, wenn das Konto inzwischen gelöscht wurde. */
export async function assertMailAccountExists(db: Db, accountId: string | null | undefined) {
  if (!accountId) return;
  const account = await db
    .selectFrom('mail_accounts')
    .select('id')
    .where('id', '=', accountId)
    .executeTakeFirst();
  if (!account) {
    throw new AppError(409, 'MAIL_ACCOUNT_NOT_FOUND', 'Das gewählte Mail-Konto existiert nicht mehr.');
  }
}
