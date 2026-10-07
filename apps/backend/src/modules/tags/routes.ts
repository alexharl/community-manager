import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { z } from 'zod';
import { parse } from '../../lib/errors';

const TagsQuerySchema = z.object({
  scope: z.enum(['all', 'documents']).default('all'),
});

/** Vorschlagslisten: Tags (Eingabe bzw. Filterleiste) und bisher verwendete Empfänger (Kap. 4.3). */
export async function tagRoutes(app: FastifyInstance) {
  app.get('/tags', async (request) => {
    const { scope } = parse(TagsQuerySchema, request.query);
    const source =
      scope === 'documents'
        ? sql`SELECT unnest(tags) AS tag FROM documents`
        : sql`SELECT unnest(tags) AS tag FROM documents UNION SELECT unnest(tags) FROM templates`;
    const { rows } = await sql<{ tag: string }>`
      SELECT tag FROM (SELECT DISTINCT tag FROM (${source}) s) t ORDER BY lower(tag), tag
    `.execute(app.db);
    return rows.map((row) => row.tag);
  });

  app.get('/recipients', async () => {
    const { rows } = await sql<{ email: string }>`
      SELECT DISTINCT email FROM (
        SELECT unnest(mail_recipients) AS email FROM templates
        UNION SELECT unnest(mail_recipients) FROM documents
        UNION SELECT unnest(to_addresses) FROM document_dispatches
      ) e ORDER BY email
    `.execute(app.db);
    return rows.map((row) => row.email);
  });
}
