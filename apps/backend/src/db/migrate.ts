import type { FastifyBaseLogger } from 'fastify';
import { Migrator, type Migration } from 'kysely/migration';
import type { Db } from './db';
import * as m001 from './migrations/001_init';
import * as m002 from './migrations/002_smart_templates';

// Statische Liste statt Dateisuche, damit Migrationen auch im gebündelten Build funktionieren
const migrations: Record<string, Migration> = {
  '001_init': m001,
  '002_smart_templates': m002,
};

export async function migrateToLatest(db: Db, log: FastifyBaseLogger): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === 'Success') log.info(`Migration ${result.migrationName} ausgeführt`);
    if (result.status === 'Error') log.error(`Migration ${result.migrationName} fehlgeschlagen`);
  }
  if (error) throw error;
}
