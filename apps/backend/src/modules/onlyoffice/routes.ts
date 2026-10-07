import { createReadStream } from 'node:fs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { JWTPayload } from 'jose';
import { z } from 'zod';
import { DOCX_MIME } from '../../lib/docx';
import { AppError, notFound, parse, parseId } from '../../lib/errors';
import { fileExists } from '../../lib/files';
import { handleDocumentCallback } from '../documents/editing';
import { getDocumentFiles } from '../documents/service';
import { docxPath } from '../documents/storage';
import { getContentFile, handleTemplateCallback } from '../templates/content';
import { previewPath } from '../templates/storage';
import type { CallbackData } from './editing';
import { bearerToken, verifyToken } from './jwt';

const CallbackSchema = z.object({
  key: z.string(),
  status: z.number().int(),
  url: z.string().optional(),
});

/** Endpunkte, die nur der Document Server aufruft (Datei laden, Speicher-Callback). */
export async function onlyofficeRoutes(app: FastifyInstance) {
  const { jwtSecret } = app.config.onlyoffice;

  /** Token aus dem Body (`inBody`) oder dem Authorization-Header prüfen. */
  async function verifiedPayload(request: FastifyRequest): Promise<JWTPayload> {
    const body = request.body as { token?: unknown } | undefined;
    const token =
      typeof body?.token === 'string' ? body.token : bearerToken(request.headers.authorization);
    if (!token) throw new AppError(401, 'TOKEN_MISSING', 'Token fehlt.');
    try {
      return await verifyToken(token, jwtSecret);
    } catch {
      throw new AppError(403, 'TOKEN_INVALID', 'Ungültiges Token.');
    }
  }

  /** Callback prüfen und verarbeiten; Antwort im vom Document Server erwarteten Format. */
  async function callback(
    request: FastifyRequest,
    logContext: Record<string, string>,
    handle: (data: CallbackData) => Promise<void>,
  ) {
    const payload = await verifiedPayload(request);
    // Header-Variante: Daten stecken in `payload`; Body-Variante: Token-Inhalt = Callback-Daten
    const data = parse(CallbackSchema, (payload.payload as object | undefined) ?? payload);
    try {
      await handle(data);
      return { error: 0 };
    } catch (error) {
      // error ≠ 0: Der Document Server behält die Änderungen und versucht es erneut
      request.log.error(
        { err: error, ...logContext, status: data.status },
        'Callback fehlgeschlagen',
      );
      return { error: 1 };
    }
  }

  app.get('/onlyoffice/documents/:id/file', async (request, reply) => {
    await verifiedPayload(request);
    const doc = await getDocumentFiles(app.db, parseId(request.params, 'Dokument'));
    return reply.type(DOCX_MIME).send(createReadStream(docxPath(app.config.dataDir, doc)));
  });

  app.post('/onlyoffice/documents/:id/callback', (request) => {
    const documentId = parseId(request.params, 'Dokument');
    return callback(request, { documentId }, (data) =>
      handleDocumentCallback(app, documentId, data),
    );
  });

  app.get('/onlyoffice/templates/:id/file', async (request, reply) => {
    await verifiedPayload(request);
    const file = await getContentFile(app, parseId(request.params, 'Vorlage'));
    return reply.type(DOCX_MIME).send(createReadStream(file));
  });

  app.post('/onlyoffice/templates/:id/callback', (request) => {
    const templateId = parseId(request.params, 'Vorlage');
    return callback(request, { templateId }, (data) =>
      handleTemplateCallback(app, templateId, data),
    );
  });

  /** Befüllte Vorlage während der Vorschau-Konvertierung (Kap. 14.4, Schritt 5). */
  app.get('/onlyoffice/templates/:id/preview-file', async (request, reply) => {
    await verifiedPayload(request);
    const file = previewPath(app.config.dataDir, parseId(request.params, 'Vorlage'));
    if (!(await fileExists(file))) throw notFound('Vorschau');
    return reply.type(DOCX_MIME).send(createReadStream(file));
  });
}
