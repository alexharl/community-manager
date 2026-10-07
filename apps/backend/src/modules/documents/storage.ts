import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { documentsDir } from '../../lib/files';
import { slugify } from '../../lib/slug';

export interface StoredDocument {
  storage_path: string;
  docx_filename: string;
  pdf_filename: string | null;
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Ablageort nach Erstelldatum (Kap. 4.4): Ordner `<YYYY>/<MM>`, Dateiname
 * `<YYYY-MM-DD>_<slug>_<id8>`. Wird einmalig festgelegt und bei Titeländerungen nicht angepasst.
 */
export function storageLocation(createdAt: Date, title: string, id: string) {
  const year = String(createdAt.getFullYear());
  const month = pad(createdAt.getMonth() + 1);
  const day = pad(createdAt.getDate());
  return {
    storagePath: `${year}/${month}`,
    baseName: `${year}-${month}-${day}_${slugify(title)}_${id.slice(0, 8)}`,
  };
}

export const folderPath = (dataDir: string, storagePath: string) =>
  join(documentsDir(dataDir), ...storagePath.split('/'));

export const docxPath = (dataDir: string, doc: StoredDocument) =>
  join(folderPath(dataDir, doc.storage_path), doc.docx_filename);

export const pdfPath = (dataDir: string, doc: StoredDocument) =>
  doc.pdf_filename ? join(folderPath(dataDir, doc.storage_path), doc.pdf_filename) : null;

/** ONLYOFFICE `document.key`: nur [0-9A-Za-z._=-], max. 128 Zeichen, neu je Bearbeitungssitzung. */
export const newEditorKey = (id: string) =>
  `${id.replace(/-/g, '')}-${randomBytes(4).toString('hex')}`;
