import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';

export async function healthRoutes(app: FastifyInstance) {
  // Wird vom Docker-Healthcheck alle 30 s aufgerufen – nicht jeden Aufruf protokollieren
  app.get('/health', { logLevel: 'warn' }, async () => {
    await sql`SELECT 1`.execute(app.db);
    return { ok: true };
  });
}
