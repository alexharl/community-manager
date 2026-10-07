import { readFile } from 'node:fs/promises';
import type { Template } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import { BLANK_DOCX_PATH } from '../../lib/assets';
import { formatGermanDate, today } from '../../lib/dates';
import { docxContentHash } from '../../lib/docx';
import { AppError, notFound } from '../../lib/errors';
import { removeFile, writeFileAtomic } from '../../lib/files';
import { newEditorKey } from '../documents/storage';
import { convertDocument } from '../onlyoffice/client';
import {
  downloadFromDocumentServer,
  forceSaveEditor,
  handleEditorCallback,
  type CallbackData,
  type EditTarget,
} from '../onlyoffice/editing';
import type { EditorFile } from '../onlyoffice/editor-config';
import { fileLocks } from '../onlyoffice/runtime';
import { getSettings } from '../settings/service';
import { analyzeTemplate } from '../smart-templates/analyze';
import { buildTemplateData } from '../smart-templates/context';
import { LinkRegistry } from '../smart-templates/links';
import { renderTemplate } from '../smart-templates/render';
import { getTemplate } from './service';
import { contentFilename, contentPath, previewPath, templateLockKey } from './storage';

/** Titel neuer Dokumente: Vorlagenname und (Sitzungs-)Datum, z. B. „Vorstandssitzung 07.10.2026“. */
export const documentTitle = (name: string, date: Date) => `${name} ${formatGermanDate(date)}`;

/** Prüfergebnis als Spalten (Kap. 14.4, Schritt 3). */
function analysisColumns(buffer: Buffer) {
  const analysis = analyzeTemplate(buffer);
  return {
    placeholders: analysis.placeholders,
    requires_date: analysis.requiresDate,
    content_error: analysis.error,
  };
}

async function assertDocx(buffer: Buffer): Promise<void> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    if (zip.file('word/document.xml')) return;
  } catch {
    // kein ZIP-Container – unten gemeldet
  }
  throw new AppError(400, 'INVALID_DOCX', 'Die Datei ist keine gültige DOCX-Datei.');
}

/**
 * Übernimmt eine neue Inhalts-DOCX samt Prüfung. Der Editor-Schlüssel wechselt, damit eine
 * noch offene Editor-Sitzung den neuen Stand nicht mit dem alten überschreibt.
 */
async function storeContent(
  app: FastifyInstance,
  id: string,
  buffer: Buffer,
  { replace }: { replace: boolean },
): Promise<Template> {
  const hash = await docxContentHash(buffer);
  await fileLocks.run(templateLockKey(id), async () => {
    const row = await app.db
      .selectFrom('templates')
      .select('content_filename')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) throw notFound('Vorlage');
    // „Inhalt gestalten“ doppelt geklickt: vorhandenen Inhalt nicht leeren
    if (row.content_filename && !replace) return;

    const filename = contentFilename(id);
    await writeFileAtomic(contentPath(app.config.dataDir, filename), buffer);
    await app.db
      .updateTable('templates')
      .set((eb) => ({
        content_filename: filename,
        content_hash: hash,
        content_version: eb('content_version', '+', 1),
        editor_key: newEditorKey(id),
        ...analysisColumns(buffer),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .execute();
  });
  return getTemplate(app.db, id);
}

/** „Inhalt gestalten“: leere DOCX anlegen, falls noch kein Inhalt existiert. */
export async function createContent(app: FastifyInstance, id: string): Promise<Template> {
  return storeContent(app, id, await readFile(BLANK_DOCX_PATH), { replace: false });
}

/** „DOCX hochladen“: ersetzt den Inhalt. */
export async function uploadContent(
  app: FastifyInstance,
  id: string,
  buffer: Buffer,
): Promise<Template> {
  await assertDocx(buffer);
  return storeContent(app, id, buffer, { replace: true });
}

async function getContentRow(app: FastifyInstance, id: string) {
  const row = await app.db
    .selectFrom('templates')
    .select(['id', 'name', 'content_filename', 'editor_key'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) throw notFound('Vorlage');
  if (!row.content_filename || !row.editor_key) throw notFound('Vorlageninhalt');
  return { ...row, content_filename: row.content_filename, editor_key: row.editor_key };
}

/** Pfad der Inhalts-DOCX für den Document Server. */
export async function getContentFile(app: FastifyInstance, id: string): Promise<string> {
  const row = await getContentRow(app, id);
  return contentPath(app.config.dataDir, row.content_filename);
}

export async function getContentEditorFile(app: FastifyInstance, id: string): Promise<EditorFile> {
  const row = await getContentRow(app, id);
  return { kind: 'templates', id, title: row.name, editorKey: row.editor_key };
}

/** Speichern im Editor: neue Inhaltsversion inkl. erneuter Prüfung (Kap. 14.4, Schritt 2–3). */
function templateEditTarget(app: FastifyInstance, id: string): EditTarget {
  return {
    lockKey: templateLockKey(id),
    logContext: { templateId: id },
    load: async () => {
      const row = await app.db
        .selectFrom('templates')
        .select(['editor_key', 'content_hash', 'content_filename'])
        .where('id', '=', id)
        .executeTakeFirst();
      return row?.content_filename
        ? {
            editorKey: row.editor_key,
            contentHash: row.content_hash,
            filePath: contentPath(app.config.dataDir, row.content_filename),
          }
        : undefined;
    },
    persist: async ({ changed, buffer, hash, rotateKey }) => {
      await app.db
        .updateTable('templates')
        .set((eb) => ({
          ...(changed
            ? {
                content_version: eb('content_version', '+', 1),
                content_hash: hash,
                ...analysisColumns(buffer),
                updated_at: new Date(),
              }
            : {}),
          ...(rotateKey ? { editor_key: newEditorKey(id) } : {}),
        }))
        .where('id', '=', id)
        .execute();
    },
  };
}

export function handleTemplateCallback(app: FastifyInstance, id: string, data: CallbackData) {
  return handleEditorCallback(app, templateEditTarget(app, id), data);
}

/** „Fertig“ im Vorlagen-Editor: sofort speichern; liefert die Vorlage mit neuem Prüfergebnis. */
export async function forceSaveContent(app: FastifyInstance, id: string): Promise<Template> {
  const row = await getContentRow(app, id);
  await forceSaveEditor(app, templateLockKey(id), row.editor_key);
  return getTemplate(app.db, id);
}

interface FillInput {
  referenceDate: Date;
  title: string;
  /** Sammelt Hinweise für die Oberfläche */
  warnings: string[];
}

/**
 * Befüllt den Vorlageninhalt (Kap. 14.4, Schritt 4). `null`, wenn die Vorlage keinen Inhalt hat.
 * Fehlerhafte Vorlagen führen zu einem 422 mit verständlicher Meldung.
 */
export async function fillTemplate(
  app: FastifyInstance,
  template: { id: string; name: string; content_filename: string | null },
  { referenceDate, title, warnings }: FillInput,
): Promise<Buffer | null> {
  const filename = template.content_filename;
  if (!filename) return null;

  const content = await fileLocks.run(templateLockKey(template.id), () =>
    readFile(contentPath(app.config.dataDir, filename)),
  );
  const { communityName } = await getSettings(app.db);
  const links = new LinkRegistry();
  const data = buildTemplateData({
    referenceDate,
    verein: communityName,
    titel: title,
    vorlage: template.name,
    events: app.eventSource,
    links,
    warnings,
    onEventsError: (error) =>
      app.log.warn({ err: error, templateId: template.id }, 'Veranstaltungen nicht abrufbar'),
  });
  return renderTemplate(content, data, links);
}

/** Vorschau als PDF (Kap. 14.4, Schritt 5) – befüllt, aber ohne ein Dokument anzulegen. */
export async function previewTemplate(
  app: FastifyInstance,
  id: string,
  date: Date | undefined,
): Promise<Buffer> {
  const template = await app.db
    .selectFrom('templates')
    .select(['id', 'name', 'content_filename'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!template) throw notFound('Vorlage');

  const referenceDate = date ?? today();
  const filled = await fillTemplate(app, template, {
    referenceDate,
    title: documentTitle(template.name, referenceDate),
    warnings: [],
  });
  if (!filled) throw notFound('Vorlageninhalt');

  // Eine Vorschau je Vorlage gleichzeitig – die Datei wird für den Document Server bereitgestellt
  return fileLocks.run(`preview:${id}`, async () => {
    const file = previewPath(app.config.dataDir, id);
    await writeFileAtomic(file, filled);
    try {
      const { onlyoffice } = app.config;
      const fileUrl = await convertDocument(onlyoffice, {
        // Jede Vorschau ist neu befüllt: eindeutiger Key, sonst liefert der DS ein gecachtes Ergebnis
        key: `tplprev${id.replace(/-/g, '')}${Date.now()}`,
        url: `${onlyoffice.backendUrl}/api/onlyoffice/templates/${id}/preview-file`,
        title: `${template.name}.docx`,
        filetype: 'docx',
        outputtype: 'pdf',
      });
      return await downloadFromDocumentServer(app, fileUrl);
    } finally {
      await removeFile(file);
    }
  });
}
