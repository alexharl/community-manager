import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import type { Db } from './db/db';
import { errorBody, errorHandler } from './lib/errors';
import { healthRoutes } from './modules/health/routes';
import { settingsRoutes } from './modules/settings/routes';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
  }
}

export async function buildApp(config: Config, db: Db): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isProduction
      ? true
      : {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname', singleLine: true },
          },
        },
  });

  app.decorate('config', config);
  app.decorate('db', db);
  app.addHook('onClose', () => db.destroy());
  app.setErrorHandler(errorHandler);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(settingsRoutes);
    },
    { prefix: '/api' },
  );

  await registerFrontend(app, config.frontendDistDir);
  return app;
}

/**
 * Liefert in Produktion den Frontend-Build aus (inkl. SPA-Fallback auf index.html).
 * Unbekannte /api-Pfade antworten immer mit dem JSON-Fehlerformat.
 */
async function registerFrontend(app: FastifyInstance, distDir: string | undefined) {
  const hasFrontend = !!distDir && existsSync(join(distDir, 'index.html'));
  if (hasFrontend) {
    await app.register(fastifyStatic, { root: distDir, wildcard: false });
  }

  app.setNotFoundHandler((request, reply) => {
    if (hasFrontend && request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send(errorBody('NOT_FOUND', 'Nicht gefunden.'));
  });
}
