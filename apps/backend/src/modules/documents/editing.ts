import type { FastifyInstance } from 'fastify';
import { docxContentHash, extractText } from '../../lib/docx';
import { AppError, notFound } from '../../lib/errors';
import { writeFileAtomic } from '../../lib/files';
import { sendCommand, toInternalUrl } from '../onlyoffice/client';
import { documentLocks, FORCESAVE_TIMEOUT_MS, forceSaveWaiters } from './runtime';
import { docxPath, newEditorKey } from './storage';

export interface CallbackData {
  key: string;
  status: number;
  url?: string;
}

/**
 * Verarbeitet ONLYOFFICE-Callbacks (Kap. 5.2):
 * 2 = Sitzung beendet → speichern + neuer Key, 6 = Force-Save → speichern, Key bleibt,
 * 3/7 = Speicherfehler, 1/4 = nichts zu tun.
 */
export async function handleCallback(app: FastifyInstance, documentId: string, data: CallbackData) {
  const log = app.log.child({ documentId, status: data.status });

  switch (data.status) {
    case 2:
    case 6: {
      if (!data.url) throw new Error(`Callback mit Status ${data.status} ohne url`);
      const changed = await saveFromUrl(app, documentId, data.key, data.url, data.status === 2);
      log.info(changed ? 'Neue Version gespeichert' : 'Keine inhaltliche Änderung');
      if (data.status === 6) forceSaveWaiters.settle(documentId);
      break;
    }
    case 3:
      log.error('Document Server meldet Speicherfehler');
      break;
    case 7:
      log.error('Document Server meldet Fehler beim Force-Save');
      forceSaveWaiters.settle(
        documentId,
        new AppError(502, 'FORCESAVE_FAILED', 'Der Document Server konnte nicht speichern.'),
      );
      break;
    default:
      log.debug('Callback ohne Handlungsbedarf');
  }
}

/**
 * Lädt die DOCX vom Document Server und legt bei geändertem Inhalt eine neue Version an:
 * Datei ersetzen, Version +1, Hash, Bearbeitungsdatum, Volltext. `rotateKey` nach Sitzungsende.
 */
async function saveFromUrl(
  app: FastifyInstance,
  documentId: string,
  key: string,
  url: string,
  rotateKey: boolean,
): Promise<boolean> {
  return documentLocks.run(documentId, async () => {
    const doc = await app.db
      .selectFrom('documents')
      .select(['editor_key', 'content_hash', 'storage_path', 'docx_filename', 'pdf_filename'])
      .where('id', '=', documentId)
      .executeTakeFirst();
    if (!doc) {
      app.log.warn({ documentId }, 'Callback für gelöschtes Dokument ignoriert');
      return false;
    }
    if (doc.editor_key !== key) {
      app.log.warn({ documentId, key }, 'Callback mit veraltetem Key ignoriert');
      return false;
    }

    const response = await fetch(toInternalUrl(app.config.onlyoffice, url), {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok)
      throw new Error(`Download vom Document Server fehlgeschlagen (${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = await docxContentHash(buffer);
    const changed = hash !== doc.content_hash;

    let contentText: string | undefined;
    if (changed) {
      contentText = await extractText(buffer);
      await writeFileAtomic(docxPath(app.config.dataDir, doc), buffer);
    }
    if (!changed && !rotateKey) return false;

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
    return changed;
  });
}

/**
 * „Abschließen“: lässt den Document Server sofort speichern und wartet auf den Callback,
 * damit die Abschlussseite den aktuellen Stand sieht (Kap. 5.3).
 */
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

  // Vor dem Command registrieren – der Callback kann vor dessen Antwort eintreffen
  const waiter = forceSaveWaiters.wait(documentId, FORCESAVE_TIMEOUT_MS);
  try {
    const { error } = await sendCommand(app.config.onlyoffice, {
      c: 'forcesave',
      key: doc.editor_key,
    });
    if (error === 0) {
      await waiter.promise;
    } else if (error !== 1 && error !== 4) {
      // 1 = keine offene Sitzung, 4 = keine Änderungen – beides heißt: Stand ist bereits gespeichert
      throw new AppError(502, 'FORCESAVE_FAILED', `Document Server meldet Fehler ${error}.`);
    }
  } finally {
    waiter.cancel();
  }

  const { version } = await app.db
    .selectFrom('documents')
    .select('version')
    .where('id', '=', documentId)
    .executeTakeFirstOrThrow();
  return { version };
}
