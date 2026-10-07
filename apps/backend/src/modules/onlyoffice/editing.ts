import type { FastifyInstance } from 'fastify';
import { docxContentHash } from '../../lib/docx';
import { AppError } from '../../lib/errors';
import { writeFileAtomic } from '../../lib/files';
import { sendCommand, toInternalUrl } from './client';
import { fileLocks, FORCESAVE_TIMEOUT_MS, forceSaveWaiters } from './runtime';

export interface CallbackData {
  key: string;
  status: number;
  url?: string;
}

/**
 * Eine im ONLYOFFICE-Editor bearbeitbare Datei (Dokument oder Vorlageninhalt).
 * Die gemeinsame Logik übernimmt Download, Inhalts-Hash, Sperre und Schlüsselwechsel.
 */
export interface EditTarget {
  /** Sperre und Force-Save-Zuordnung: Dokument-ID bzw. `template:<id>` */
  lockKey: string;
  logContext: Record<string, string>;
  load(): Promise<
    { editorKey: string | null; contentHash: string | null; filePath: string } | undefined
  >;
  /** Neuen Stand übernehmen: `changed` → neue Version; `rotateKey` → neuer Editor-Schlüssel. */
  persist(change: {
    changed: boolean;
    buffer: Buffer;
    hash: string;
    rotateKey: boolean;
  }): Promise<void>;
}

/**
 * Verarbeitet ONLYOFFICE-Callbacks (Kap. 5.2):
 * 2 = Sitzung beendet → speichern + neuer Key, 6 = Force-Save → speichern, Key bleibt,
 * 3/7 = Speicherfehler, 1/4 = nichts zu tun.
 */
export async function handleEditorCallback(
  app: FastifyInstance,
  target: EditTarget,
  data: CallbackData,
) {
  const log = app.log.child({ ...target.logContext, status: data.status });

  switch (data.status) {
    case 2:
    case 6: {
      if (!data.url) throw new Error(`Callback mit Status ${data.status} ohne url`);
      const changed = await saveFromUrl(app, target, data.key, data.url, data.status === 2);
      log.info(changed ? 'Neue Version gespeichert' : 'Keine inhaltliche Änderung');
      if (data.status === 6) forceSaveWaiters.settle(target.lockKey);
      break;
    }
    case 3:
      log.error('Document Server meldet Speicherfehler');
      break;
    case 7:
      log.error('Document Server meldet Fehler beim Force-Save');
      forceSaveWaiters.settle(
        target.lockKey,
        new AppError(502, 'FORCESAVE_FAILED', 'Der Document Server konnte nicht speichern.'),
      );
      break;
    default:
      log.debug('Callback ohne Handlungsbedarf');
  }
}

/** Lädt eine Datei vom Document Server (Host durch die interne Adresse ersetzt). */
export async function downloadFromDocumentServer(
  app: FastifyInstance,
  url: string,
): Promise<Buffer> {
  const response = await fetch(toInternalUrl(app.config.onlyoffice, url), {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`Download vom Document Server fehlgeschlagen (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Neue Fassung übernehmen, wenn sich der Inhalt geändert hat (Inhalts-Hash, Kap. 5.2). */
async function saveFromUrl(
  app: FastifyInstance,
  target: EditTarget,
  key: string,
  url: string,
  rotateKey: boolean,
): Promise<boolean> {
  return fileLocks.run(target.lockKey, async () => {
    const current = await target.load();
    if (!current) {
      app.log.warn(target.logContext, 'Callback für gelöschte Datei ignoriert');
      return false;
    }
    if (current.editorKey !== key) {
      app.log.warn({ ...target.logContext, key }, 'Callback mit veraltetem Key ignoriert');
      return false;
    }

    const buffer = await downloadFromDocumentServer(app, url);
    const hash = await docxContentHash(buffer);
    const changed = hash !== current.contentHash;
    if (changed) await writeFileAtomic(current.filePath, buffer);
    if (!changed && !rotateKey) return false;

    await target.persist({ changed, buffer, hash, rotateKey });
    return changed;
  });
}

/**
 * Lässt den Document Server sofort speichern und wartet auf den Callback (Kap. 5.3) –
 * für „Abschließen“ bei Dokumenten und „Fertig“ bei Vorlageninhalten.
 */
export async function forceSaveEditor(
  app: FastifyInstance,
  lockKey: string,
  editorKey: string,
): Promise<void> {
  // Vor dem Command registrieren – der Callback kann vor dessen Antwort eintreffen
  const waiter = forceSaveWaiters.wait(lockKey, FORCESAVE_TIMEOUT_MS);
  try {
    const { error } = await sendCommand(app.config.onlyoffice, { c: 'forcesave', key: editorKey });
    if (error === 0) {
      await waiter.promise;
    } else if (error !== 1 && error !== 4) {
      // 1 = keine offene Sitzung, 4 = keine Änderungen – beides heißt: Stand ist bereits gespeichert
      throw new AppError(502, 'FORCESAVE_FAILED', `Document Server meldet Fehler ${error}.`);
    }
  } finally {
    waiter.cancel();
  }
}
