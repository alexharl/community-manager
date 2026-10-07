import { describe, expect, it } from 'vitest';
import { buildDispatchGroups, normalizeRecipientSet, type Dispatch } from './dispatches';

let counter = 0;
function dispatch(partial: Partial<Dispatch>): Dispatch {
  counter += 1;
  return {
    id: `d${counter}`,
    documentVersion: 1,
    mailAccountId: 'konto',
    fromAddress: 'vorstand@tsv.de',
    toAddresses: ['a@x.de', 'b@y.de'],
    rejectedAddresses: [],
    subject: 'Protokoll',
    introText: null,
    status: 'sent',
    error: null,
    createdAt: `2026-10-0${counter % 9 || 1}T10:00:00.000Z`,
    sentAt: null,
    ...partial,
  };
}

const config = { fromAddress: 'vorstand@tsv.de', recipients: ['b@y.de', 'A@x.de'] };

describe('normalizeRecipientSet', () => {
  it('ignoriert Reihenfolge, Groß-/Kleinschreibung und Duplikate', () => {
    expect(normalizeRecipientSet([' B@y.de', 'a@x.de', 'b@y.de'])).toEqual(['a@x.de', 'b@y.de']);
  });
});

describe('buildDispatchGroups', () => {
  it('ergänzt ohne Versendungen eine aktive Gruppe im Zustand „new“', () => {
    const groups = buildDispatchGroups({ version: 1, ...config, dispatches: [] });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ active: true, state: 'new', to: ['a@x.de', 'b@y.de'] });
  });

  it('hat ohne gültiges Konto oder ohne Empfänger keine aktive Gruppe', () => {
    expect(
      buildDispatchGroups({
        version: 1,
        fromAddress: null,
        recipients: ['a@x.de'],
        dispatches: [],
      }),
    ).toEqual([]);
    expect(
      buildDispatchGroups({ version: 1, fromAddress: 'v@tsv.de', recipients: [], dispatches: [] }),
    ).toEqual([]);
  });

  it('bestimmt die Zustände pending, current, failed, outdated', () => {
    const state = (version: number, dispatches: Dispatch[]) =>
      buildDispatchGroups({ version, ...config, dispatches })[0]?.state;

    expect(state(2, [dispatch({ status: 'pending', documentVersion: 2 })])).toBe('pending');
    expect(state(2, [dispatch({ documentVersion: 2 })])).toBe('current');
    expect(state(3, [dispatch({ documentVersion: 2 })])).toBe('outdated');
    expect(
      state(3, [
        dispatch({ status: 'failed', documentVersion: 3, createdAt: '2026-10-07T12:00:00.000Z' }),
        dispatch({ documentVersion: 2, createdAt: '2026-10-07T11:00:00.000Z' }),
      ]),
    ).toBe('failed');
  });

  it('bleibt „current“, wenn nach erfolgreichem Versand ein „Nochmals senden“ fehlschlug', () => {
    const groups = buildDispatchGroups({
      version: 2,
      ...config,
      dispatches: [
        dispatch({ status: 'failed', documentVersion: 2, createdAt: '2026-10-07T12:00:00.000Z' }),
        dispatch({ documentVersion: 2, createdAt: '2026-10-07T11:00:00.000Z' }),
      ],
    });
    expect(groups[0]?.state).toBe('current');
  });

  it('trennt Gruppen nach Absender und Empfängerliste, aktive zuerst', () => {
    const groups = buildDispatchGroups({
      version: 3,
      ...config,
      dispatches: [
        dispatch({
          toAddresses: ['a@x.de'],
          documentVersion: 1,
          createdAt: '2026-10-07T13:00:00.000Z',
        }),
        dispatch({
          toAddresses: ['b@y.de', 'a@x.de'],
          documentVersion: 2,
          createdAt: '2026-10-07T12:00:00.000Z',
        }),
        dispatch({
          fromAddress: 'kasse@tsv.de',
          documentVersion: 3,
          createdAt: '2026-10-07T14:00:00.000Z',
        }),
      ],
    });
    expect(
      groups.map((g) => [g.from, g.to.join(','), g.active, g.state, g.lastSentVersion]),
    ).toEqual([
      ['vorstand@tsv.de', 'a@x.de,b@y.de', true, 'outdated', 2],
      ['kasse@tsv.de', 'a@x.de,b@y.de', false, 'current', 3],
      ['vorstand@tsv.de', 'a@x.de', false, 'outdated', 1],
    ]);
  });
});
