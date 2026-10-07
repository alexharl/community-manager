import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Quelltext liegt unter src/lib, der Build unter dist – beide unterhalb des Backend-Pakets
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [resolve(here, '../../assets'), resolve(here, '../assets')];

export const ASSETS_DIR =
  candidates.find((dir) => existsSync(join(dir, 'blank.docx'))) ?? (candidates[0] as string);

/** Leere DOCX (A4, deutsch) aus den ONLYOFFICE-Leervorlagen – Basis neuer Dokumente. */
export const BLANK_DOCX_PATH = join(ASSETS_DIR, 'blank.docx');
