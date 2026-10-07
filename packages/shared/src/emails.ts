import { z } from 'zod';

const EmailSchema = z.email();

export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

export const isValidEmail = (value: string): boolean => EmailSchema.safeParse(value).success;

/** Empfängerliste: kleingeschrieben, validiert, ohne Duplikate; Reihenfolge bleibt erhalten. */
export const RecipientsSchema = z
  .array(z.string().trim().toLowerCase().pipe(z.email('Ungültige E-Mail-Adresse.')))
  .max(100)
  .transform((emails) => [...new Set(emails)]);
