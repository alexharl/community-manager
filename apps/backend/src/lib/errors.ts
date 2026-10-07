import type { ApiErrorBody } from '@cm/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

/** Fachlicher Fehler mit HTTP-Status und maschinenlesbarem Code. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} nicht gefunden.`);

const IdParamsSchema = z.object({ id: z.uuid() });

/** Liest `:id` aus den Routenparametern; keine gültige UUID bedeutet „nicht gefunden“. */
export function parseId(params: unknown, what: string): string {
  const result = IdParamsSchema.safeParse(params);
  if (!result.success) throw notFound(what);
  return result.data.id;
}

export const errorBody = (code: string, message: string): ApiErrorBody => ({
  error: { code, message },
});

/** Validiert Eingaben mit zod und wirft bei Fehlern einen 400er. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Lesbarer Satz für die Oberfläche, z. B. „SMTP-Host fehlt. Ungültige E-Mail-Adresse.“
    const messages = new Set(result.error.issues.map((issue) => issue.message));
    throw new AppError(400, 'VALIDATION', [...messages].join(' '));
  }
  return result.data;
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(errorBody(error.code, error.message));
  }
  const status = error.statusCode ?? 500;
  if (status < 500) {
    return reply.status(status).send(errorBody(error.code ?? 'BAD_REQUEST', error.message));
  }
  request.log.error(error);
  return reply.status(500).send(errorBody('INTERNAL', 'Interner Serverfehler.'));
}
