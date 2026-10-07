import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const documentsDir = (dataDir: string) => join(dataDir, 'documents');
export const brandingDir = (dataDir: string) => join(dataDir, 'branding');

/** Legt die Ablageordner unterhalb von DATA_DIR an (Spezifikation Kap. 4.4). */
export async function ensureDataDirs(dataDir: string): Promise<void> {
  await mkdir(documentsDir(dataDir), { recursive: true });
  await mkdir(brandingDir(dataDir), { recursive: true });
}
