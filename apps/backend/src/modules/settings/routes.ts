import { createReadStream } from 'node:fs';
import { SettingsUpdateSchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { AppError, parse } from '../../lib/errors';
import { getLogoFile, getSettings, removeLogo, saveLogo, updateSettings } from './service';

export async function settingsRoutes(app: FastifyInstance) {
  const { dataDir } = app.config;

  app.get('/settings', () => getSettings(app.db));

  app.patch('/settings', (request) =>
    updateSettings(app.db, parse(SettingsUpdateSchema, request.body)),
  );

  app.put('/settings/logo', async (request) => {
    const file = await request.file();
    if (!file) throw new AppError(400, 'FILE_MISSING', 'Keine Datei übermittelt.');

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new AppError(413, 'FILE_TOO_LARGE', 'Das Logo darf höchstens 2 MB groß sein.');
      }
      throw error;
    }
    return saveLogo(app.db, dataDir, buffer);
  });

  app.delete('/settings/logo', () => removeLogo(app.db, dataDir));

  app.get('/settings/logo', async (_request, reply) => {
    const logo = await getLogoFile(app.db, dataDir);
    // URL enthält den eindeutigen Dateinamen, daher dauerhaft cachebar
    reply
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .header('X-Content-Type-Options', 'nosniff');
    if (logo.mime === 'image/svg+xml') {
      // SVG kann Skripte enthalten – beim direkten Öffnen nichts ausführen
      reply.header(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
    }
    return reply.type(logo.mime).send(createReadStream(logo.path));
  });
}
