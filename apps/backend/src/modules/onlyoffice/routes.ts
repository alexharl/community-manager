import { createReadStream } from 'node:fs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { JWTPayload } from 'jose';
import { z } from 'zod';
import { DOCX_MIME } from '../../lib/docx';
import { AppError, parse, parseId } from '../../lib/errors';
import { handleCallback } from '../documents/editing';
import { getDocumentFiles } from '../documents/service';
import { docxPath } from '../documents/storage';
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

  app.get('/onlyoffice/documents/:id/file', async (request, reply) => {
    await verifiedPayload(request);
    const doc = await getDocumentFiles(app.db, parseId(request.params, 'Dokument'));
    return reply.type(DOCX_MIME).send(createReadStream(docxPath(app.config.dataDir, doc)));
  });

  app.post('/onlyoffice/documents/:id/callback', async (request) => {
    const payload = await verifiedPayload(request);
    const documentId = parseId(request.params, 'Dokument');
    // Header-Variante: Daten stecken in `payload`; Body-Variante: Token-Inhalt = Callback-Daten
    const data = parse(CallbackSchema, (payload.payload as object | undefined) ?? payload);

    try {
      await handleCallback(app, documentId, data);
      return { error: 0 };
    } catch (error) {
      // error ≠ 0: Der Document Server behält die Änderungen und versucht es erneut
      request.log.error({ err: error, documentId, status: data.status }, 'Callback fehlgeschlagen');
      return { error: 1 };
    }
  });
}
