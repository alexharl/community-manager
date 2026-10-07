import { join } from 'node:path';
import { templatesDir } from '../../lib/files';

/** Sperre und Force-Save-Zuordnung eines Vorlageninhalts (geteilt mit Dokument-IDs). */
export const templateLockKey = (id: string) => `template:${id}`;

/** Vorlageninhalt: `DATA_DIR/templates/<id>.docx` (Kap. 14.4). */
export const contentFilename = (id: string) => `${id}.docx`;

export const contentPath = (dataDir: string, filename: string) =>
  join(templatesDir(dataDir), filename);

/** Befüllte Vorlage für die Vorschau – nur während der PDF-Erzeugung vorhanden. */
export const previewPath = (dataDir: string, id: string) =>
  join(templatesDir(dataDir), 'previews', `${id}.docx`);
