import { createReadStream } from 'node:fs';
import { DocumentCreateSchema, DocumentPatchSchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DOCX_MIME } from '../../lib/docx';
import { parse, parseId } from '../../lib/errors';
import { contentDisposition } from '../../lib/files';
import { buildEditorConfig } from '../onlyoffice/editor-config';
import { forceSave } from './editing';
import {
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentFiles,
  listDocuments,
  updateDocument,
} from './service';
import { docxPath } from './storage';

const ListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  // Wiederholter Parameter (?tags=a&tags=b), da Tags Kommas enthalten können
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value])),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const EditorQuerySchema = z.object({
  mode: z.enum(['edit', 'view']).default('edit'),
  theme: z.enum(['light', 'dark']).default('light'),
});

export async function documentRoutes(app: FastifyInstance) {
  const { dataDir } = app.config;
  const documentId = (params: unknown) => parseId(params, 'Dokument');

  app.get('/documents', (request) => listDocuments(app.db, parse(ListQuerySchema, request.query)));

  app.post('/documents', async (request, reply) => {
    const { templateId } = parse(DocumentCreateSchema, request.body);
    return reply.status(201).send(await createDocument(app.db, dataDir, templateId));
  });

  app.get('/documents/:id', (request) => getDocument(app.db, dataDir, documentId(request.params)));

  app.patch('/documents/:id', (request) =>
    updateDocument(app.db, dataDir, documentId(request.params), parse(DocumentPatchSchema, request.body)),
  );

  app.delete('/documents/:id', async (request, reply) => {
    await deleteDocument(app.db, dataDir, documentId(request.params));
    return reply.status(204).send();
  });

  app.get('/documents/:id/editor-config', async (request) => {
    const { mode, theme } = parse(EditorQuerySchema, request.query);
    const doc = await getDocumentFiles(app.db, documentId(request.params));
    return buildEditorConfig(app.config.onlyoffice, doc, mode, theme);
  });

  app.post('/documents/:id/forcesave', (request) => forceSave(app, documentId(request.params)));

  app.get('/documents/:id/docx', async (request, reply) => {
    const doc = await getDocumentFiles(app.db, documentId(request.params));
    return reply
      .type(DOCX_MIME)
      .header('Content-Disposition', contentDisposition('attachment', `${doc.title}.docx`))
      .send(createReadStream(docxPath(dataDir, doc)));
  });
}
