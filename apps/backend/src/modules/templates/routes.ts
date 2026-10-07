import { TEMPLATE_CONTENT_MAX_BYTES, TemplateCreateSchema, TemplatePatchSchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseIsoDate } from '../../lib/dates';
import { AppError, parse, parseId } from '../../lib/errors';
import { contentDisposition } from '../../lib/files';
import { buildEditorConfig } from '../onlyoffice/editor-config';
import {
  createContent,
  forceSaveContent,
  getContentEditorFile,
  previewTemplate,
  uploadContent,
} from './content';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from './service';

const EditorQuerySchema = z.object({ theme: z.enum(['light', 'dark']).default('light') });
const PreviewQuerySchema = z.object({ date: z.iso.date('Ungültiges Datum.').optional() });

export async function templateRoutes(app: FastifyInstance) {
  const templateId = (params: unknown) => parseId(params, 'Vorlage');

  app.get('/templates', () => listTemplates(app.db));

  app.post('/templates', async (request, reply) => {
    const { name } = parse(TemplateCreateSchema, request.body);
    return reply.status(201).send(await createTemplate(app.db, name));
  });

  app.get('/templates/:id', (request) => getTemplate(app.db, templateId(request.params)));

  app.patch('/templates/:id', (request) =>
    updateTemplate(app.db, templateId(request.params), parse(TemplatePatchSchema, request.body)),
  );

  app.delete('/templates/:id', async (request, reply) => {
    await deleteTemplate(app.db, app.config.dataDir, templateId(request.params));
    return reply.status(204).send();
  });

  // Vorlageninhalt (smarte Vorlagen, Kap. 14.6)
  app.post('/templates/:id/content', (request) => createContent(app, templateId(request.params)));

  app.put('/templates/:id/content', async (request) => {
    const id = templateId(request.params);
    const file = await request.file({ limits: { fileSize: TEMPLATE_CONTENT_MAX_BYTES } });
    if (!file) throw new AppError(400, 'FILE_MISSING', 'Keine Datei übermittelt.');

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new AppError(413, 'FILE_TOO_LARGE', 'Die Vorlage darf höchstens 10 MB groß sein.');
      }
      throw error;
    }
    return uploadContent(app, id, buffer);
  });

  app.get('/templates/:id/editor-config', async (request) => {
    const { theme } = parse(EditorQuerySchema, request.query);
    const file = await getContentEditorFile(app, templateId(request.params));
    return buildEditorConfig(app.config.onlyoffice, file, 'edit', theme);
  });

  app.post('/templates/:id/forcesave', (request) =>
    forceSaveContent(app, templateId(request.params)),
  );

  app.get('/templates/:id/preview', async (request, reply) => {
    const id = templateId(request.params);
    const { date } = parse(PreviewQuerySchema, request.query);
    const pdf = await previewTemplate(app, id, date ? parseIsoDate(date) : undefined);
    const { name } = await getTemplate(app.db, id);
    return reply
      .type('application/pdf')
      .header('Cache-Control', 'no-store')
      .header('Content-Disposition', contentDisposition('inline', `Vorschau ${name}.pdf`))
      .send(pdf);
  });
}
