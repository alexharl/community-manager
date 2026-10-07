import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { Settings, SettingsUpdate } from '@cm/shared';
import type { Db } from '../../db/db';
import { AppError, notFound } from '../../lib/errors';
import { brandingDir, removeFile, writeFileAtomic } from '../../lib/files';
import { detectImageType } from '../../lib/images';

export async function getSettings(db: Db): Promise<Settings> {
  const row = await db
    .selectFrom('app_settings')
    .select(['community_name', 'logo_filename'])
    .where('id', '=', 1)
    .executeTakeFirstOrThrow();

  return {
    communityName: row.community_name,
    // Dateiname ist je Upload eindeutig und dient als Cache-Buster
    logoUrl: row.logo_filename
      ? `/api/settings/logo?v=${encodeURIComponent(row.logo_filename)}`
      : null,
  };
}

export async function updateSettings(db: Db, input: SettingsUpdate): Promise<Settings> {
  await db
    .updateTable('app_settings')
    .set({ community_name: input.communityName, updated_at: new Date() })
    .where('id', '=', 1)
    .execute();
  return getSettings(db);
}

async function currentLogoFilename(db: Db): Promise<string | null> {
  const row = await db
    .selectFrom('app_settings')
    .select('logo_filename')
    .where('id', '=', 1)
    .executeTakeFirstOrThrow();
  return row.logo_filename;
}

export async function saveLogo(db: Db, dataDir: string, buffer: Buffer): Promise<Settings> {
  const type = detectImageType(buffer);
  if (!type) {
    throw new AppError(
      400,
      'UNSUPPORTED_IMAGE',
      'Bitte ein Bild im Format PNG, JPG, WebP oder SVG hochladen.',
    );
  }

  const filename = `logo-${randomBytes(4).toString('hex')}.${type.ext}`;
  await writeFileAtomic(join(brandingDir(dataDir), filename), buffer);

  const previous = await currentLogoFilename(db);
  await db
    .updateTable('app_settings')
    .set({ logo_filename: filename, logo_mime: type.mime, updated_at: new Date() })
    .where('id', '=', 1)
    .execute();
  if (previous) await removeFile(join(brandingDir(dataDir), previous));

  return getSettings(db);
}

export async function removeLogo(db: Db, dataDir: string): Promise<Settings> {
  const previous = await currentLogoFilename(db);
  await db
    .updateTable('app_settings')
    .set({ logo_filename: null, logo_mime: null, updated_at: new Date() })
    .where('id', '=', 1)
    .execute();
  if (previous) await removeFile(join(brandingDir(dataDir), previous));

  return getSettings(db);
}

export async function getLogoFile(
  db: Db,
  dataDir: string,
): Promise<{ path: string; mime: string }> {
  const row = await db
    .selectFrom('app_settings')
    .select(['logo_filename', 'logo_mime'])
    .where('id', '=', 1)
    .executeTakeFirstOrThrow();
  if (!row.logo_filename || !row.logo_mime) throw notFound('Logo');
  return { path: join(brandingDir(dataDir), row.logo_filename), mime: row.logo_mime };
}
