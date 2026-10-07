import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await sql`SELECT 1`.execute(app.db);
    return { ok: true };
  });
}
