import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const documentsDir = (dataDir: string) => join(dataDir, 'documents');
export const brandingDir = (dataDir: string) => join(dataDir, 'branding');

/** Legt die Ablageordner unterhalb von DATA_DIR an (Spezifikation Kap. 4.4). */
export async function ensureDataDirs(dataDir: string): Promise<void> {
  await mkdir(documentsDir(dataDir), { recursive: true });
  await mkdir(brandingDir(dataDir), { recursive: true });
}

/** Schreibt erst in eine Temp-Datei im selben Ordner und benennt dann um – nie halbe Dateien. */
export async function writeFileAtomic(path: string, data: Buffer | string): Promise<void> {
  const tmp = `${path}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, path);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
}

/** Löscht eine Datei; fehlt sie bereits, ist das kein Fehler. */
export async function removeFile(path: string): Promise<void> {
  await rm(path, { force: true });
}
