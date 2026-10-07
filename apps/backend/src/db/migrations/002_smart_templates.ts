import { sql, type Kysely } from 'kysely';

// Smarte Vorlagen (Spezifikation Kap. 14.5)
const statements = [
  `ALTER TABLE templates
    ADD COLUMN content_filename text,
    ADD COLUMN content_hash     text,
    ADD COLUMN content_version  integer NOT NULL DEFAULT 0,
    ADD COLUMN editor_key       text,
    ADD COLUMN placeholders     text[]  NOT NULL DEFAULT '{}',
    ADD COLUMN requires_date    boolean NOT NULL DEFAULT false,
    ADD COLUMN content_error    text`,
  `ALTER TABLE documents ADD COLUMN reference_date date`,
];

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const statement of statements) {
    await sql.raw(statement).execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql.raw('ALTER TABLE documents DROP COLUMN reference_date').execute(db);
  await sql
    .raw(
      `ALTER TABLE templates
        DROP COLUMN content_filename, DROP COLUMN content_hash, DROP COLUMN content_version,
        DROP COLUMN editor_key, DROP COLUMN placeholders, DROP COLUMN requires_date,
        DROP COLUMN content_error`,
    )
    .execute(db);
}
