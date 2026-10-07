import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import mammoth from 'mammoth';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Rohtext einer DOCX für den Volltextindex (Kap. 5.5). */
export async function extractText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value.replace(/\n{3,}/g, '\n\n').trim();
}

// Nur Metadaten (Änderungsdatum, Bearbeiter, Bearbeitungszeit) – beeinflussen weder PDF noch Mail
const VOLATILE_ENTRIES = /^docProps\//;

/**
 * Hash über den entpackten Inhalt einer DOCX. ONLYOFFICE erzeugt bei jedem Speichern einen
 * neuen ZIP-Container (Zeitstempel, Kompression), auch wenn sich nichts geändert hat –
 * ein Hash über die Datei würde dann fälschlich eine neue Version auslösen.
 */
export async function docxContentHash(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const hash = createHash('sha256');
  const names = Object.keys(zip.files)
    .filter((name) => !zip.files[name]?.dir && !VOLATILE_ENTRIES.test(name))
    .sort();
  for (const name of names) {
    hash.update(`${name}\0`);
    hash.update(await zip.files[name]!.async('uint8array'));
  }
  return hash.digest('hex');
}
