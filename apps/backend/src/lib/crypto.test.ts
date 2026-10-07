import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './crypto';

const key = randomBytes(32);

describe('encrypt/decrypt', () => {
  it('entschlüsselt den ursprünglichen Wert (inkl. Umlaute)', () => {
    expect(decrypt(encrypt('geheim-Passwört!', key), key)).toBe('geheim-Passwört!');
  });

  it('erzeugt für denselben Wert unterschiedliche Chiffrate', () => {
    expect(encrypt('x', key)).not.toBe(encrypt('x', key));
  });

  it('erkennt manipulierte Daten und falsche Schlüssel', () => {
    const [iv, tag, data] = encrypt('geheim', key).split('.');
    const tampered = [iv, tag, Buffer.from('anders').toString('base64')].join('.');
    expect(() => decrypt(tampered, key)).toThrow();
    expect(() => decrypt([iv, tag, data].join('.'), randomBytes(32))).toThrow();
  });
});
