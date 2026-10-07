import { readFile } from 'node:fs/promises';
import { normalizeRecipientSet, type Dispatch, type DispatchCreateSchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { Db } from '../../db/db';
import { AppError, notFound } from '../../lib/errors';
import { buildMailContent, type MailContent } from '../../lib/mail-content';
import { createTransport } from '../../lib/mailer';
import { ensurePdfLocked } from '../documents/pdf';
import { documentLocks } from '../documents/runtime';
import { docxPath, pdfPath } from '../documents/storage';
import { getSmtpAccount, type SmtpAccount } from '../mail-accounts/service';
import { getSettings } from '../settings/service';

type CreateInput = z.output<typeof DispatchCreateSchema>;

const COLUMNS = [
  'id',
  'document_version',
  'mail_account_id',
  'from_address',
  'to_addresses',
  'rejected_addresses',
  'subject',
  'intro_text',
  'status',
  'error',
  'created_at',
  'sent_at',
] as const;

const selectDispatches = (db: Db) => db.selectFrom('document_dispatches').select(COLUMNS);
type Row = Awaited<ReturnType<ReturnType<typeof selectDispatches>['executeTakeFirstOrThrow']>>;

function toDto(row: Row): Dispatch {
  return {
    id: row.id,
    documentVersion: row.document_version,
    mailAccountId: row.mail_account_id,
    fromAddress: row.from_address,
    toAddresses: row.to_addresses,
    rejectedAddresses: row.rejected_addresses,
    subject: row.subject,
    introText: row.intro_text,
    status: row.status,
    error: row.error,
    createdAt: row.created_at.toISOString(),
    sentAt: row.sent_at?.toISOString() ?? null,
  };
}

export async function listDispatches(db: Db, documentId: string): Promise<Dispatch[]> {
  const doc = await db
    .selectFrom('documents')
    .select('id')
    .where('id', '=', documentId)
    .executeTakeFirst();
  if (!doc) throw notFound('Dokument');
  const rows = await selectDispatches(db)
    .where('document_id', '=', documentId)
    .orderBy('created_at', 'desc')
    .execute();
  return rows.map(toDto);
}

const sameSet = (a: string[], b: string[]) =>
  normalizeRecipientSet(a).join(',') === normalizeRecipientSet(b).join(',');

/** Laufende Zustellungen – beim Herunterfahren abwarten. */
const deliveries = new Set<Promise<void>>();

export function waitForDeliveries(): Promise<unknown> {
  return Promise.allSettled([...deliveries]);
}

/**
 * Legt eine Versendung an und stellt sie im Hintergrund zu (Kap. 5.6).
 * Gesendet wird genau das, was im Dialog bestätigt wurde: Konto und Empfänger müssen der
 * gespeicherten Konfiguration entsprechen, sonst 409 CONFIG_CHANGED.
 */
export async function createDispatch(
  app: FastifyInstance,
  documentId: string,
  input: CreateInput,
): Promise<Dispatch> {
  const { db } = app;
  const doc = await db
    .selectFrom('documents')
    .select(['mail_enabled', 'mail_account_id', 'mail_recipients'])
    .where('id', '=', documentId)
    .executeTakeFirst();
  if (!doc) throw notFound('Dokument');
  if (!doc.mail_enabled) {
    throw new AppError(409, 'MAIL_DISABLED', 'Für dieses Dokument ist kein Mailversand aktiviert.');
  }
  if (input.accountId !== doc.mail_account_id || !sameSet(input.recipients, doc.mail_recipients)) {
    throw new AppError(
      409,
      'CONFIG_CHANGED',
      'Die Mail-Einstellungen wurden zwischenzeitlich geändert. Bitte prüfen und erneut versenden.',
    );
  }
  const account = await getSmtpAccount(db, input.accountId, app.config.appSecret);
  if (!account)
    throw new AppError(409, 'MAIL_ACCOUNT_MISSING', 'Das Mail-Konto existiert nicht mehr.');
  const { communityName } = await getSettings(db);

  // Snapshot unter der Sperre: PDF, DOCX und Version gehören garantiert zusammen
  const snapshot = await documentLocks.run(documentId, async () => {
    const pdf = await ensurePdfLocked(app, documentId);
    const files = await db
      .selectFrom('documents')
      .select(['title', 'content_text', 'storage_path', 'docx_filename', 'pdf_filename'])
      .where('id', '=', documentId)
      .executeTakeFirstOrThrow();
    const [pdfBuffer, docxBuffer] = await Promise.all([
      readFile(pdfPath(app.config.dataDir, files)!),
      readFile(docxPath(app.config.dataDir, files)),
    ]);
    return {
      version: pdf.version,
      title: files.title,
      contentText: files.content_text,
      pdfBuffer,
      docxBuffer,
    };
  });

  const content = await buildMailContent({
    docx: snapshot.docxBuffer,
    contentText: snapshot.contentText,
    introText: input.introText,
  });
  const to = normalizeRecipientSet(input.recipients);

  const row = await db
    .insertInto('document_dispatches')
    .values({
      document_id: documentId,
      document_version: snapshot.version,
      mail_account_id: input.accountId,
      from_address: account.fromAddress,
      to_addresses: to,
      subject: snapshot.title,
      intro_text: input.introText ?? null,
      status: 'pending',
    })
    .returning(COLUMNS)
    .executeTakeFirstOrThrow();

  const delivery = deliver(app, row.id, {
    account,
    fromName: account.fromName ?? communityName,
    to,
    subject: snapshot.title,
    content,
    pdf: snapshot.pdfBuffer,
    pdfName: `${snapshot.title.replace(/[\\/:*?"<>|]/g, '-')}.pdf`,
  });
  deliveries.add(delivery);
  void delivery.finally(() => deliveries.delete(delivery));

  return toDto(row);
}

interface Delivery {
  account: SmtpAccount;
  fromName: string;
  to: string[];
  subject: string;
  content: MailContent;
  pdf: Buffer;
  pdfName: string;
}

/** Eine gemeinsame Mail an alle Empfänger (A1); Ergebnis landet in der Versendung. */
async function deliver(app: FastifyInstance, dispatchId: string, mail: Delivery): Promise<void> {
  const transport = createTransport(mail.account);
  try {
    const info = await transport.sendMail({
      from: { name: mail.fromName, address: mail.account.fromAddress },
      to: mail.to,
      subject: mail.subject,
      html: mail.content.html,
      text: mail.content.text,
      attachments: [
        { filename: mail.pdfName, content: mail.pdf, contentType: 'application/pdf' },
        ...mail.content.images.map((image) => ({
          filename: image.filename,
          content: image.content,
          contentType: image.contentType,
          cid: image.cid,
        })),
      ],
    });
    const rejected = info.rejected.map((entry: string | { address: string }) =>
      typeof entry === 'string' ? entry : entry.address,
    );
    await app.db
      .updateTable('document_dispatches')
      .set({
        status: 'sent',
        sent_at: new Date(),
        message_id: info.messageId,
        rejected_addresses: rejected,
      })
      .where('id', '=', dispatchId)
      .execute();
    app.log.info(
      { dispatchId, recipients: mail.to.length, rejected: rejected.length },
      'Mail versendet',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.log.error({ err: error, dispatchId }, 'Mailversand fehlgeschlagen');
    await app.db
      .updateTable('document_dispatches')
      .set({ status: 'failed', error: message })
      .where('id', '=', dispatchId)
      .execute()
      .catch((dbError: unknown) =>
        app.log.error({ err: dbError, dispatchId }, 'Status nicht speicherbar'),
      );
  } finally {
    transport.close();
  }
}

/**
 * Zustellung läuft im Prozess – nach einem Neustart kann keine Versendung mehr „pending“ sein.
 * Gibt die Anzahl der abgebrochenen Versendungen zurück.
 */
export async function failInterruptedDispatches(db: Db): Promise<number> {
  const result = await db
    .updateTable('document_dispatches')
    .set({ status: 'failed', error: 'Versand durch Neustart des Servers abgebrochen.' })
    .where('status', '=', 'pending')
    .executeTakeFirst();
  return Number(result.numUpdatedRows);
}
