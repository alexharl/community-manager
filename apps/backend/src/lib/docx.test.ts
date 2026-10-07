import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { BLANK_DOCX_PATH } from './assets';
import { docxContentHash, extractText } from './docx';

async function buildDocx(entries: Record<string, string>, options: { date: Date; level: number }) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(entries)) zip.file(name, content, { date: options.date });
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: options.level },
  });
}

const entries = {
  'word/document.xml': '<w:document>Protokoll</w:document>',
  'word/styles.xml': '<w:styles/>',
  'docProps/core.xml': '<dcterms:modified>2026-10-07T10:00:00Z</dcterms:modified>',
};

describe('docxContentHash', () => {
  it('ist unabhängig von ZIP-Zeitstempeln, Kompression und Metadaten', async () => {
    const a = await buildDocx(entries, { date: new Date(2026, 0, 1), level: 1 });
    const b = await buildDocx(
      { ...entries, 'docProps/core.xml': '<dcterms:modified>2026-10-07T10:05:00Z</dcterms:modified>' },
      { date: new Date(2026, 5, 1), level: 9 },
    );
    expect(a.equals(b)).toBe(false);
    expect(await docxContentHash(a)).toBe(await docxContentHash(b));
  });

  it('erkennt inhaltliche Änderungen', async () => {
    const options = { date: new Date(2026, 0, 1), level: 6 };
    const a = await buildDocx(entries, options);
    const b = await buildDocx({ ...entries, 'word/document.xml': '<w:document>Protokoll!</w:document>' }, options);
    expect(await docxContentHash(a)).not.toBe(await docxContentHash(b));
  });
});

describe('extractText', () => {
  it('liest die leere Vorlage ohne Fehler', async () => {
    expect(await extractText(await readFile(BLANK_DOCX_PATH))).toBe('');
  });
});
