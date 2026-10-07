import { describe, expect, it } from 'vitest';
import { conversionErrorMessage, toInternalUrl } from './client';

const config = {
  publicUrl: 'http://localhost:8090',
  internalUrl: 'http://onlyoffice',
  jwtSecret: 'x'.repeat(16),
  backendUrl: 'http://app:3000',
};

describe('toInternalUrl', () => {
  it('ersetzt nur den Host und behält Pfad und Signatur-Parameter', () => {
    expect(
      toInternalUrl(
        config,
        'http://localhost:8090/cache/files/data/abc/output.pdf?md5=x&expires=1',
      ),
    ).toBe('http://onlyoffice/cache/files/data/abc/output.pdf?md5=x&expires=1');
  });
});

describe('conversionErrorMessage', () => {
  it('übersetzt bekannte und unbekannte Fehlercodes', () => {
    expect(conversionErrorMessage(-4)).toBe(
      'PDF-Erzeugung fehlgeschlagen: Dokument konnte nicht geladen werden.',
    );
    expect(conversionErrorMessage(-99)).toBe('PDF-Erzeugung fehlgeschlagen: Fehler -99.');
  });
});
