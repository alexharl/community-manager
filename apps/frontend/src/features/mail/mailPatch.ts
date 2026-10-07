import type { MailConfig } from '@cm/shared';

export type MailPatch = Partial<Pick<MailConfig, 'enabled' | 'accountId' | 'recipients'>>;

/** Lokale Mail-Konfiguration aktualisieren; ein neu gewähltes Konto hebt „Mail-Konto gelöscht“ auf. */
export function applyMailPatch(current: MailConfig, patch: MailPatch): MailConfig {
  return { ...current, ...patch, ...(patch.accountId ? { accountDeleted: false } : {}) };
}
