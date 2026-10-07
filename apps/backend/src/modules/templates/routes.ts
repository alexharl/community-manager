import { TemplateCreateSchema, TemplatePatchSchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { parse, parseId } from '../../lib/errors';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from './service';

export async function templateRoutes(app: FastifyInstance) {
  app.get('/templates', () => listTemplates(app.db));

  app.post('/templates', async (request, reply) => {
    const { name } = parse(TemplateCreateSchema, request.body);
    return reply.status(201).send(await createTemplate(app.db, name));
  });

  app.get('/templates/:id', (request) => getTemplate(app.db, parseId(request.params, 'Vorlage')));

  app.patch('/templates/:id', (request) =>
    updateTemplate(
      app.db,
      parseId(request.params, 'Vorlage'),
      parse(TemplatePatchSchema, request.body),
    ),
  );

  app.delete('/templates/:id', async (request, reply) => {
    await deleteTemplate(app.db, parseId(request.params, 'Vorlage'));
    return reply.status(204).send();
  });
}
