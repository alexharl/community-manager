import { DispatchCreateSchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { parse, parseId } from '../../lib/errors';
import { createDispatch, listDispatches, waitForDeliveries } from './service';

export async function dispatchRoutes(app: FastifyInstance) {
  const documentId = (params: unknown) => parseId(params, 'Dokument');

  // Laufende Zustellungen beim Herunterfahren abschließen lassen
  app.addHook('onClose', () => waitForDeliveries());

  app.get('/documents/:id/dispatches', (request) =>
    listDispatches(app.db, documentId(request.params)),
  );

  app.post('/documents/:id/dispatches', async (request, reply) => {
    const dispatch = await createDispatch(
      app,
      documentId(request.params),
      parse(DispatchCreateSchema, request.body),
    );
    return reply.status(202).send(dispatch);
  });
}
