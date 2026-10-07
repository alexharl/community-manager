import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './types';

// DATE-Spalten als Text (JJJJ-MM-TT) statt als Date um Mitternacht lokaler Zeit
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

export type Db = Kysely<Database>;

export function createDb(connectionString: string): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) }),
  });
}
