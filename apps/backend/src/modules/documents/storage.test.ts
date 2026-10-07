import { describe, expect, it } from 'vitest';
import { newEditorKey, storageLocation } from './storage';

const id = '1b2c3d4e-0000-4000-8000-000000000000';

describe('storageLocation', () => {
  it('legt nach Jahr/Monat ab und baut den Dateinamen aus Datum, Slug und ID', () => {
    const location = storageLocation(new Date(2026, 9, 7, 14, 30), 'Vorstandssitzung 07.10.2026', id);
    expect(location).toEqual({
      storagePath: '2026/10',
      baseName: '2026-10-07_vorstandssitzung-07-10-2026_1b2c3d4e',
    });
  });
});

describe('newEditorKey', () => {
  it('erfüllt die ONLYOFFICE-Regeln und ist je Aufruf neu', () => {
    const key = newEditorKey(id);
    expect(key).toMatch(/^[0-9A-Za-z._=-]{1,128}$/);
    expect(key.startsWith('1b2c3d4e0000400080000')).toBe(true);
    expect(newEditorKey(id)).not.toBe(key);
  });
});
