import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import type {
  DocumentDetail,
  DocumentPatchSchema,
  DocumentSummary,
  Page,
  PdfInfo,
} from '@cm/shared';
import type { z } from 'zod';
import type { Db } from '../../db/db';
import { BLANK_DOCX_PATH } from '../../lib/assets';
import { docxContentHash } from '../../lib/docx';
import { notFound } from '../../lib/errors';
import { fileExists, removeFile, writeFileAtomic } from '../../lib/files';
import { assertMailAccountExists, mailConfigColumns, toMailConfig } from '../../lib/mail-config';
import { decodeCursor, encodeCursor } from './cursor';
import { documentLocks } from './runtime';
import {
  docxPath,
  folderPath,
  newEditorKey,
  pdfPath,
  storageLocation,
  type StoredDocument,
} from './storage';

type Patch = z.output<typeof DocumentPatchSchema>;

const SUMMARY_COLUMNS = [
  'id',
  'title',
  'tags',
  'template_id',
  'template_name',
  'created_at',
  'edited_at',
] as const;

const DETAIL_COLUMNS = [
  ...SUMMARY_COLUMNS,
  'version',
  'storage_path',
  'docx_filename',
  'pdf_filename',
  'pdf_version',
  'pdf_created_at',
  'mail_enabled',
  'mail_account_id',
  'mail_account_deleted',
  'mail_recipients',
  'updated_at',
] as const;

const selectDetail = (db: Db) => db.selectFrom('documents').select(DETAIL_COLUMNS);
type DetailRow = Awaited<ReturnType<ReturnType<typeof selectDetail>['executeTakeFirstOrThrow']>>;
type SummaryRow = Pick<DetailRow, (typeof SUMMARY_COLUMNS)[number]>;

const germanDate = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function toSummary(row: SummaryRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    tags: row.tags,
    templateName: row.template_name,
    templateDeleted: row.template_id === null && row.template_name !== null,
    createdAt: row.created_at.toISOString(),
    editedAt: row.edited_at.toISOString(),
  };
}

async function toDetail(row: DetailRow, dataDir: string): Promise<DocumentDetail> {
  let pdf: PdfInfo | null = null;
  const pdfFile = pdfPath(dataDir, row);
  if (pdfFile && row.pdf_filename && row.pdf_version !== null && row.pdf_created_at) {
    pdf = {
      filename: row.pdf_filename,
      version: row.pdf_version,
      createdAt: row.pdf_created_at.toISOString(),
      current: row.pdf_version === row.version && (await fileExists(pdfFile)),
    };
  }
  return {
    ...toSummary(row),
    templateId: row.template_id,
    version: row.version,
    storagePath: row.storage_path,
    docxFilename: row.docx_filename,
    pdf,
    mail: toMailConfig(row),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getDocument(db: Db, dataDir: string, id: string): Promise<DocumentDetail> {
  const row = await selectDetail(db).where('id', '=', id).executeTakeFirst();
  if (!row) throw notFound('Dokument');
  return toDetail(row, dataDir);
}

/** Dateiablage und Editor-Daten eines Dokuments (für ONLYOFFICE, Downloads). */
export async function getDocumentFiles(db: Db, id: string) {
  const row = await db
    .selectFrom('documents')
    .select(['id', 'title', 'editor_key', 'storage_path', 'docx_filename', 'pdf_filename'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) throw notFound('Dokument');
  return row;
}

export async function listDocuments(
  db: Db,
  { cursor, limit }: { cursor?: string; limit: number },
): Promise<Page<DocumentSummary>> {
  let query = db
    .selectFrom('documents')
    .select(SUMMARY_COLUMNS)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(limit + 1);

  if (cursor) {
    const after = decodeCursor(cursor);
    query = query.where((eb) =>
      eb(eb.refTuple('created_at', 'id'), '<', eb.tuple(after.createdAt, after.id)),
    );
  }

  const rows = await query.execute();
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items: items.map(toSummary),
    nextCursor: rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null,
  };
}

/**
 * Legt Datensatz und DOCX an (Kap. 5.1). Titel, Tags und Mail-Konfiguration
 * werden aus der Vorlage übernommen (Entscheidung A3, A5).
 */
export async function createDocument(
  db: Db,
  dataDir: string,
  templateId: string | null,
): Promise<DocumentDetail> {
  const template = templateId
    ? await db.selectFrom('templates').selectAll().where('id', '=', templateId).executeTakeFirst()
    : null;
  if (templateId && !template) throw notFound('Vorlage');

  const id = randomUUID();
  // Millisekunden-genau aus JS, damit der Listen-Cursor exakt bleibt
  const now = new Date();
  const title = `${template?.name ?? 'Dokument'} ${germanDate.format(now)}`;
  const { storagePath, baseName } = storageLocation(now, title, id);
  const stored: StoredDocument = {
    storage_path: storagePath,
    docx_filename: `${baseName}.docx`,
    pdf_filename: null,
  };

  const content = await readFile(BLANK_DOCX_PATH);
  await mkdir(folderPath(dataDir, storagePath), { recursive: true });
  await writeFileAtomic(docxPath(dataDir, stored), content);

  await db
    .insertInto('documents')
    .values({
      id,
      title,
      storage_path: stored.storage_path,
      docx_filename: stored.docx_filename,
      template_id: template?.id ?? null,
      template_name: template?.name ?? null,
      content_hash: await docxContentHash(content),
      editor_key: newEditorKey(id),
      tags: template?.tags ?? [],
      mail_enabled: template?.mail_enabled ?? false,
      mail_account_id: template?.mail_account_id ?? null,
      mail_account_deleted: template?.mail_account_deleted ?? false,
      mail_recipients: template?.mail_recipients ?? [],
      created_at: now,
      edited_at: now,
      updated_at: now,
    })
    .execute();

  return getDocument(db, dataDir, id);
}

export async function updateDocument(
  db: Db,
  dataDir: string,
  id: string,
  patch: Patch,
): Promise<DocumentDetail> {
  await assertMailAccountExists(db, patch.mail?.accountId);
  const result = await db
    .updateTable('documents')
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...mailConfigColumns(patch.mail),
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  if (result.numUpdatedRows === 0n) throw notFound('Dokument');
  return getDocument(db, dataDir, id);
}

/** Entfernt Datensatz (Versendungen per CASCADE) und danach DOCX und PDF (Kap. 4.5). */
export async function deleteDocument(db: Db, dataDir: string, id: string): Promise<void> {
  await documentLocks.run(id, async () => {
    const row = await db
      .deleteFrom('documents')
      .where('id', '=', id)
      .returning(['storage_path', 'docx_filename', 'pdf_filename'])
      .executeTakeFirst();
    if (!row) throw notFound('Dokument');
    await removeFile(docxPath(dataDir, row));
    const pdf = pdfPath(dataDir, row);
    if (pdf) await removeFile(pdf);
  });
}
