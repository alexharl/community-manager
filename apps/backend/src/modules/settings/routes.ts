import type { FastifyInstance } from 'fastify';
import { getSettings } from './service';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', () => getSettings(app.db));
}
