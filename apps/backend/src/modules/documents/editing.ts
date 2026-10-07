import type { FastifyInstance } from 'fastify';
import { extractText } from '../../lib/docx';
import { notFound } from '../../lib/errors';
import {
  forceSaveEditor,
  handleEditorCallback,
  type CallbackData,
  type EditTarget,
} from '../onlyoffice/editing';
import { docxPath, newEditorKey } from './storage';

/** Dokument als bearbeitbare Datei: neue Version mit Volltext und Bearbeitungsdatum (Kap. 5.2). */
function documentEditTarget(app: FastifyInstance, documentId: string): EditTarget {
  return {
    lockKey: documentId,
    logContext: { documentId },
    load: async () => {
      const doc = await app.db
        .selectFrom('documents')
        .select(['editor_key', 'content_hash', 'storage_path', 'docx_filename', 'pdf_filename'])
        .where('id', '=', documentId)
        .executeTakeFirst();
      return (
        doc && {
          editorKey: doc.editor_key,
          contentHash: doc.content_hash,
          filePath: docxPath(app.config.dataDir, doc),
        }
      );
    },
    persist: async ({ changed, buffer, hash, rotateKey }) => {
      const contentText = changed ? await extractText(buffer) : undefined;
      const now = new Date();
      await app.db
        .updateTable('documents')
        .set((eb) => ({
          ...(changed
            ? {
                version: eb('version', '+', 1),
                content_hash: hash,
                content_text: contentText,
                edited_at: now,
                updated_at: now,
              }
            : {}),
          // Nach Sitzungsende muss der nächste Editor einen neuen Key bekommen
          ...(rotateKey ? { editor_key: newEditorKey(documentId) } : {}),
        }))
        .where('id', '=', documentId)
        .execute();
    },
  };
}

export function handleDocumentCallback(
  app: FastifyInstance,
  documentId: string,
  data: CallbackData,
) {
  return handleEditorCallback(app, documentEditTarget(app, documentId), data);
}

/** „Abschließen“: sofort speichern lassen, damit die Abschlussseite den aktuellen Stand sieht. */
export async function forceSave(
  app: FastifyInstance,
  documentId: string,
): Promise<{ version: number }> {
  const doc = await app.db
    .selectFrom('documents')
    .select('editor_key')
    .where('id', '=', documentId)
    .executeTakeFirst();
  if (!doc) throw notFound('Dokument');

  await forceSaveEditor(app, documentId, doc.editor_key);

  const { version } = await app.db
    .selectFrom('documents')
    .select('version')
    .where('id', '=', documentId)
    .executeTakeFirstOrThrow();
  return { version };
}
