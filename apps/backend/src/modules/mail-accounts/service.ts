import type { MailAccount, MailAccountInputSchema, MailAccountVerifySchema } from '@cm/shared';
import { sql } from 'kysely';
import type { z } from 'zod';
import type { Db } from '../../db/db';
import { decrypt, encrypt } from '../../lib/crypto';
import { AppError, notFound } from '../../lib/errors';
import { createTransport } from '../../lib/mailer';

type Input = z.output<typeof MailAccountInputSchema>;
type VerifyInput = z.output<typeof MailAccountVerifySchema>;

// Passwort wird nie selektiert – es verlässt das Backend nicht
function selectAccounts(db: Db) {
  return db
    .selectFrom('mail_accounts')
    .select(['id', 'label', 'smtp_host', 'smtp_port', 'smtp_user', 'from_address', 'from_name'])
    .select(
      sql<number>`(SELECT count(*)::int FROM templates t WHERE t.mail_account_id = mail_accounts.id)`.as(
        'template_count',
      ),
    );
}

type Row = Awaited<ReturnType<ReturnType<typeof selectAccounts>['executeTakeFirstOrThrow']>>;

function toDto(row: Row): MailAccount {
  return {
    id: row.id,
    label: row.label,
    displayName: row.label ?? row.smtp_user,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    fromAddress: row.from_address,
    fromName: row.from_name,
    effectiveFromAddress: row.from_address ?? row.smtp_user,
    templateCount: row.template_count,
  };
}

const columns = (input: Input) => ({
  label: input.label ?? null,
  smtp_host: input.smtpHost,
  smtp_port: input.smtpPort,
  smtp_user: input.smtpUser,
  from_address: input.fromAddress ?? null,
  from_name: input.fromName ?? null,
});

const missingPassword = () => new AppError(400, 'VALIDATION', 'SMTP-Passwort fehlt.');

export async function listMailAccounts(db: Db): Promise<MailAccount[]> {
  const rows = await selectAccounts(db)
    .orderBy(sql`lower(coalesce(label, smtp_user))`)
    .execute();
  return rows.map(toDto);
}

export async function getMailAccount(db: Db, id: string): Promise<MailAccount> {
  const row = await selectAccounts(db).where('id', '=', id).executeTakeFirst();
  if (!row) throw notFound('Mail-Konto');
  return toDto(row);
}

export async function createMailAccount(db: Db, input: Input, key: Buffer): Promise<MailAccount> {
  if (!input.smtpPass) throw missingPassword();
  const { id } = await db
    .insertInto('mail_accounts')
    .values({ ...columns(input), smtp_pass_enc: encrypt(input.smtpPass, key) })
    .returning('id')
    .executeTakeFirstOrThrow();
  return getMailAccount(db, id);
}

export async function updateMailAccount(
  db: Db,
  id: string,
  input: Input,
  key: Buffer,
): Promise<MailAccount> {
  const result = await db
    .updateTable('mail_accounts')
    .set({
      ...columns(input),
      // Leeres Passwort = unverändert
      ...(input.smtpPass ? { smtp_pass_enc: encrypt(input.smtpPass, key) } : {}),
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  if (result.numUpdatedRows === 0n) throw notFound('Mail-Konto');
  return getMailAccount(db, id);
}

/**
 * Vorlagen und Dokumente mit diesem Konto erhalten den Hinweis „Mail-Konto gelöscht“;
 * Versendungen behalten ihre Absenderadresse als Snapshot (Spezifikation Kap. 4.5).
 */
export async function deleteMailAccount(db: Db, id: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('templates')
      .set({ mail_account_id: null, mail_account_deleted: true })
      .where('mail_account_id', '=', id)
      .execute();
    await trx
      .updateTable('documents')
      .set({ mail_account_id: null, mail_account_deleted: true })
      .where('mail_account_id', '=', id)
      .execute();
    const result = await trx.deleteFrom('mail_accounts').where('id', '=', id).executeTakeFirst();
    if (result.numDeletedRows === 0n) throw notFound('Mail-Konto');
  });
}

export interface SmtpAccount {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string | null;
}

/** SMTP-Zugang inkl. entschlüsseltem Passwort – nur für den Versand im Backend. */
export async function getSmtpAccount(db: Db, id: string, key: Buffer): Promise<SmtpAccount | null> {
  const row = await db
    .selectFrom('mail_accounts')
    .select(['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass_enc', 'from_address', 'from_name'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) return null;
  return {
    host: row.smtp_host,
    port: row.smtp_port,
    user: row.smtp_user,
    pass: decrypt(row.smtp_pass_enc, key),
    fromAddress: row.from_address ?? row.smtp_user,
    fromName: row.from_name,
  };
}

/** Prüft Verbindung und Anmeldung am SMTP-Server, ohne eine Mail zu senden. */
export async function verifyMailAccount(db: Db, input: VerifyInput, key: Buffer): Promise<void> {
  let pass = input.smtpPass;
  if (!pass && input.id) {
    const row = await db
      .selectFrom('mail_accounts')
      .select('smtp_pass_enc')
      .where('id', '=', input.id)
      .executeTakeFirst();
    if (!row) throw notFound('Mail-Konto');
    pass = decrypt(row.smtp_pass_enc, key);
  }
  if (!pass) throw missingPassword();

  const transport = createTransport({
    host: input.smtpHost,
    port: input.smtpPort,
    user: input.smtpUser,
    pass,
  });
  try {
    await transport.verify();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AppError(502, 'SMTP_VERIFY_FAILED', `Verbindung fehlgeschlagen: ${reason}`);
  } finally {
    transport.close();
  }
}
