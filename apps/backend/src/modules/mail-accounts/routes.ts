import { MailAccountInputSchema, MailAccountVerifySchema } from '@cm/shared';
import type { FastifyInstance } from 'fastify';
import { parse, parseId } from '../../lib/errors';
import {
  createMailAccount,
  deleteMailAccount,
  listMailAccounts,
  updateMailAccount,
  verifyMailAccount,
} from './service';

export async function mailAccountRoutes(app: FastifyInstance) {
  const key = app.config.appSecret;

  app.get('/mail-accounts', () => listMailAccounts(app.db));

  app.post('/mail-accounts', async (request, reply) => {
    const account = await createMailAccount(app.db, parse(MailAccountInputSchema, request.body), key);
    return reply.status(201).send(account);
  });

  app.put('/mail-accounts/:id', (request) =>
    updateMailAccount(
      app.db,
      parseId(request.params, 'Mail-Konto'),
      parse(MailAccountInputSchema, request.body),
      key,
    ),
  );

  app.delete('/mail-accounts/:id', async (request, reply) => {
    await deleteMailAccount(app.db, parseId(request.params, 'Mail-Konto'));
    return reply.status(204).send();
  });

  app.post('/mail-accounts/verify', async (request) => {
    await verifyMailAccount(app.db, parse(MailAccountVerifySchema, request.body), key);
    return { ok: true };
  });
}
