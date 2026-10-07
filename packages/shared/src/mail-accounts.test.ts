import { describe, expect, it } from 'vitest';
import './zod-locale';
import { MailAccountInputSchema } from './mail-accounts';

const valid = { smtpHost: 'smtp.example.org', smtpPort: '587', smtpUser: 'vorstand@example.org' };

describe('MailAccountInputSchema', () => {
  it('wandelt leere optionale Felder in null und den Port in eine Zahl', () => {
    const result = MailAccountInputSchema.parse({
      ...valid,
      label: '  ',
      fromAddress: '',
      fromName: '',
    });
    expect(result).toMatchObject({ smtpPort: 587, label: null, fromAddress: null, fromName: null });
  });

  it('trimmt Eingaben', () => {
    const result = MailAccountInputSchema.parse({
      ...valid,
      smtpHost: ' smtp.example.org ',
      fromAddress: ' a@b.de ',
    });
    expect(result.smtpHost).toBe('smtp.example.org');
    expect(result.fromAddress).toBe('a@b.de');
  });

  it('meldet Pflichtfelder, ungültige Adresse und Port mit deutschem Text', () => {
    const result = MailAccountInputSchema.safeParse({
      smtpHost: '',
      smtpPort: '',
      smtpUser: '',
      fromAddress: 'kein-mail',
    });
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(result.error!.issues.map((i) => [i.path[0], i.message]));
    expect(messages).toEqual({
      smtpHost: 'SMTP-Host fehlt.',
      smtpPort: 'Port muss zwischen 1 und 65535 liegen.',
      smtpUser: 'SMTP-Benutzer fehlt.',
      fromAddress: 'Ungültige E-Mail-Adresse.',
    });
  });
});
