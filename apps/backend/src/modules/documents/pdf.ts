import type { PdfInfo } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { notFound } from '../../lib/errors';
import { fileExists, writeFileAtomic } from '../../lib/files';
import { convertDocument, toInternalUrl } from '../onlyoffice/client';
import { documentLocks } from './runtime';
import { pdfPath } from './storage';

/**
 * Stellt sicher, dass die PDF zur aktuellen Version existiert (Kap. 5.4).
 * Idempotent; läuft unter der Dokumentsperre, daher kann sich die Version währenddessen
 * nicht ändern, und parallele Aufrufe warten auf dieselbe Erzeugung.
 */
export function ensurePdf(app: FastifyInstance, documentId: string): Promise<PdfInfo> {
  return documentLocks.run(documentId, () => ensurePdfLocked(app, documentId));
}

/** Wie `ensurePdf`, aber nur innerhalb von `documentLocks.run` für dieses Dokument aufrufen. */
export async function ensurePdfLocked(app: FastifyInstance, documentId: string): Promise<PdfInfo> {
  const doc = await app.db
    .selectFrom('documents')
    .select([
      'id',
      'title',
      'version',
      'storage_path',
      'docx_filename',
      'pdf_filename',
      'pdf_version',
      'pdf_created_at',
    ])
    .where('id', '=', documentId)
    .executeTakeFirst();
  if (!doc) throw notFound('Dokument');

  const existing = pdfPath(app.config.dataDir, doc);
  if (
    existing &&
    doc.pdf_filename &&
    doc.pdf_created_at &&
    doc.pdf_version === doc.version &&
    (await fileExists(existing))
  ) {
    return {
      filename: doc.pdf_filename,
      version: doc.version,
      createdAt: doc.pdf_created_at.toISOString(),
      current: true,
    };
  }

  const { onlyoffice } = app.config;
  const fileUrl = await convertDocument(onlyoffice, {
    // Key je Version: Der Document Server cacht Konvertierungen anhand des Keys
    key: `${doc.id.replace(/-/g, '')}_v${doc.version}_pdf`,
    url: `${onlyoffice.backendUrl}/api/onlyoffice/documents/${doc.id}/file`,
    title: `${doc.title}.docx`,
    filetype: 'docx',
    outputtype: 'pdf',
  });

  const response = await fetch(toInternalUrl(onlyoffice, fileUrl), {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok)
    throw new Error(`PDF-Download vom Document Server fehlgeschlagen (${response.status})`);

  // Gleicher Basisname wie die DOCX; bei Neuerzeugung überschrieben
  const pdfFilename = doc.docx_filename.replace(/\.docx$/i, '.pdf');
  await writeFileAtomic(
    pdfPath(app.config.dataDir, { ...doc, pdf_filename: pdfFilename })!,
    Buffer.from(await response.arrayBuffer()),
  );

  const createdAt = new Date();
  await app.db
    .updateTable('documents')
    .set({ pdf_filename: pdfFilename, pdf_version: doc.version, pdf_created_at: createdAt })
    .where('id', '=', doc.id)
    .execute();
  app.log.info({ documentId, version: doc.version }, 'PDF erzeugt');

  return {
    filename: pdfFilename,
    version: doc.version,
    createdAt: createdAt.toISOString(),
    current: true,
  };
}
