import { z } from 'zod';
import type { ISODate } from './api';
import { RecipientsSchema } from './emails';

export type DispatchStatus = 'pending' | 'sent' | 'failed';

/** Eine Versendung: eine gemeinsame Mail eines Stands an eine Empfängerliste (Entscheidung A1). */
export interface Dispatch {
  id: string;
  documentVersion: number;
  mailAccountId: string | null;
  fromAddress: string;
  /** Normalisiert und sortiert. */
  toAddresses: string[];
  rejectedAddresses: string[];
  subject: string;
  introText: string | null;
  status: DispatchStatus;
  error: string | null;
  createdAt: ISODate;
  sentAt: ISODate | null;
}

export const DispatchCreateSchema = z.object({
  accountId: z.uuid(),
  recipients: RecipientsSchema.refine((list) => list.length > 0, 'Keine Empfänger angegeben.'),
  introText: z
    .string()
    .max(5000)
    .optional()
    .transform((text) => text?.trim() || undefined),
});
export type DispatchCreate = z.input<typeof DispatchCreateSchema>;

export type DispatchGroupState = 'new' | 'pending' | 'current' | 'outdated' | 'failed';

export interface DispatchGroup {
  key: string;
  from: string;
  /** Empfängerliste, normalisiert und sortiert. */
  to: string[];
  state: DispatchGroupState;
  /** Passt zur aktuellen Konfiguration → Aktion erlaubt. */
  active: boolean;
  /** Höchste erfolgreich versendete Version, für „zuletzt vY versendet“. */
  lastSentVersion: number | null;
  /** Neueste zuerst. */
  dispatches: Dispatch[];
}

/** Empfängermenge: Reihenfolge egal, kleingeschrieben, ohne Duplikate. */
export function normalizeRecipientSet(recipients: string[]): string[] {
  return [...new Set(recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))].sort();
}

const groupKey = (from: string, to: string[]) => `${from.toLowerCase()}\n${to.join(',')}`;

function groupState(dispatches: Dispatch[], version: number): DispatchGroupState {
  if (dispatches.some((d) => d.status === 'pending')) return 'pending';
  if (dispatches.some((d) => d.status === 'sent' && d.documentVersion === version))
    return 'current';
  if (dispatches[0]?.status === 'failed') return 'failed';
  if (dispatches.some((d) => d.status === 'sent')) return 'outdated';
  return 'new';
}

interface BuildDispatchGroupsInput {
  /** Aktuelle Dokumentversion. */
  version: number;
  /** Absender des gewählten Kontos; `null` ohne gültiges Konto. */
  fromAddress: string | null;
  recipients: string[];
  dispatches: Dispatch[];
}

/**
 * Bildet die Versandgruppen der Abschlussseite (Spezifikation Kap. 5.6):
 * gruppiert nach Absender + Empfängermenge, ergänzt die aktive Gruppe der aktuellen
 * Konfiguration und bestimmt je Gruppe den Zustand. Aktive Gruppe zuerst, dann neueste.
 */
export function buildDispatchGroups({
  version,
  fromAddress,
  recipients,
  dispatches,
}: BuildDispatchGroupsInput): DispatchGroup[] {
  const groups = new Map<string, DispatchGroup>();
  const sorted = [...dispatches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const dispatch of sorted) {
    const to = normalizeRecipientSet(dispatch.toAddresses);
    const key = groupKey(dispatch.fromAddress, to);
    const group = groups.get(key) ?? {
      key,
      from: dispatch.fromAddress,
      to,
      state: 'new' as const,
      active: false,
      lastSentVersion: null,
      dispatches: [],
    };
    group.dispatches.push(dispatch);
    groups.set(key, group);
  }

  const activeTo = normalizeRecipientSet(recipients);
  const activeKey = fromAddress && activeTo.length > 0 ? groupKey(fromAddress, activeTo) : null;
  if (activeKey && fromAddress && !groups.has(activeKey)) {
    groups.set(activeKey, {
      key: activeKey,
      from: fromAddress,
      to: activeTo,
      state: 'new',
      active: false,
      lastSentVersion: null,
      dispatches: [],
    });
  }

  const result = [...groups.values()].map((group) => {
    const sentVersions = group.dispatches
      .filter((d) => d.status === 'sent')
      .map((d) => d.documentVersion);
    return {
      ...group,
      active: group.key === activeKey,
      state: groupState(group.dispatches, version),
      lastSentVersion: sentVersions.length > 0 ? Math.max(...sentVersions) : null,
    };
  });

  const latest = (group: DispatchGroup) => group.dispatches[0]?.createdAt ?? '';
  return result.sort(
    (a, b) => Number(b.active) - Number(a.active) || latest(b).localeCompare(latest(a)),
  );
}
