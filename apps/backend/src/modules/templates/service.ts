import type { Template, TemplatePatchSchema } from '@cm/shared';
import { sql } from 'kysely';
import type { z } from 'zod';
import type { Db } from '../../db/db';
import { notFound } from '../../lib/errors';
import { removeFile } from '../../lib/files';
import { assertMailAccountExists, mailConfigColumns, toMailConfig } from '../../lib/mail-config';
import { fileLocks } from '../onlyoffice/runtime';
import { contentPath, templateLockKey } from './storage';

type Patch = z.output<typeof TemplatePatchSchema>;

function selectTemplates(db: Db) {
  return db
    .selectFrom('templates')
    .select([
      'id',
      'name',
      'tags',
      'mail_enabled',
      'mail_account_id',
      'mail_account_deleted',
      'mail_recipients',
      'content_filename',
      'content_version',
      'requires_date',
      'placeholders',
      'content_error',
      'created_at',
      'updated_at',
    ]);
}

type Row = Awaited<ReturnType<ReturnType<typeof selectTemplates>['executeTakeFirstOrThrow']>>;

function toDto(row: Row): Template {
  return {
    id: row.id,
    name: row.name,
    tags: row.tags,
    mail: toMailConfig(row),
    content: {
      exists: row.content_filename !== null,
      version: row.content_version,
      requiresDate: row.requires_date,
      placeholders: row.placeholders,
      error: row.content_error,
    },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listTemplates(db: Db): Promise<Template[]> {
  const rows = await selectTemplates(db)
    .orderBy(sql`lower(name)`)
    .execute();
  return rows.map(toDto);
}

export async function getTemplate(db: Db, id: string): Promise<Template> {
  const row = await selectTemplates(db).where('id', '=', id).executeTakeFirst();
  if (!row) throw notFound('Vorlage');
  return toDto(row);
}

export async function createTemplate(db: Db, name: string): Promise<Template> {
  const { id } = await db
    .insertInto('templates')
    .values({ name })
    .returning('id')
    .executeTakeFirstOrThrow();
  return getTemplate(db, id);
}

export async function updateTemplate(db: Db, id: string, patch: Patch): Promise<Template> {
  await assertMailAccountExists(db, patch.mail?.accountId);
  const result = await db
    .updateTable('templates')
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...mailConfigColumns(patch.mail),
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  if (result.numUpdatedRows === 0n) throw notFound('Vorlage');
  return getTemplate(db, id);
}

/**
 * Dokumente behalten den Vorlagennamen als Snapshot; `template_id` wird per FK `NULL` (Kap. 4.5).
 * Ein Vorlageninhalt wird mit entfernt.
 */
export async function deleteTemplate(db: Db, dataDir: string, id: string): Promise<void> {
  await fileLocks.run(templateLockKey(id), async () => {
    const row = await db
      .deleteFrom('templates')
      .where('id', '=', id)
      .returning('content_filename')
      .executeTakeFirst();
    if (!row) throw notFound('Vorlage');
    if (row.content_filename) await removeFile(contentPath(dataDir, row.content_filename));
  });
}
