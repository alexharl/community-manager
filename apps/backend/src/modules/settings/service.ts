import type { Settings } from '@cm/shared';
import type { Db } from '../../db/db';

export async function getSettings(db: Db): Promise<Settings> {
  const row = await db
    .selectFrom('app_settings')
    .select(['community_name', 'logo_filename', 'updated_at'])
    .where('id', '=', 1)
    .executeTakeFirstOrThrow();

  return {
    communityName: row.community_name,
    // Zeitstempel als Cache-Buster, damit ein neues Logo sofort sichtbar ist
    logoUrl: row.logo_filename ? `/api/settings/logo?v=${row.updated_at.getTime()}` : null,
  };
}
