import { z } from 'zod';
import { AppError } from '../../lib/errors';

/**
 * Keyset-Cursor der Dokumentliste: (created_at, id) der letzten Zeile.
 * `created_at` wird beim Anlegen mit Millisekunden-Genauigkeit gesetzt, daher verlustfrei als ISO-String.
 */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

const CursorSchema = z.tuple([z.iso.datetime(), z.uuid()]);

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const result = CursorSchema.safeParse(Buffer.from(cursor, 'base64url').toString('utf8').split('|'));
  if (!result.success) throw new AppError(400, 'INVALID_CURSOR', 'Ungültiger Cursor.');
  const [createdAt, id] = result.data;
  return { createdAt: new Date(createdAt), id };
}
