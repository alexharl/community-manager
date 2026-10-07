import {
  buildDispatchGroups,
  type DocumentDetail,
  type DispatchGroup,
  type MailConfig,
} from '@cm/shared';
import { useState } from 'react';
import { useDispatches } from '../../api/dispatches';
import { useMailAccounts } from '../../api/mailAccounts';
import { Card, LoadingState, Stack, Text } from '../../components/ui';
import { MailConfigFields } from '../mail/MailConfigFields';
import type { MailPatch } from '../mail/mailPatch';
import { DispatchConfirmDialog } from './DispatchConfirmDialog';
import { DispatchGroupItem } from './DispatchGroupItem';

interface DispatchSectionProps {
  document: DocumentDetail;
  /** Lokale (sofort aktualisierte) Mail-Konfiguration des Dokuments. */
  mail: MailConfig;
  onMailChange: (patch: MailPatch) => void;
  /** Änderungen an der Konfiguration werden gerade gespeichert. */
  configSaving: boolean;
  pdfReady: boolean;
}

/** Mail-Karte der Abschlussseite: Konfiguration, aktive Gruppe und frühere Empfängerlisten (Kap. 7.4.8). */
export function DispatchSection({
  document,
  mail,
  onMailChange,
  configSaving,
  pdfReady,
}: DispatchSectionProps) {
  const { data: accounts } = useMailAccounts();
  const { data: dispatches, isPending } = useDispatches(document.id);
  const [confirming, setConfirming] = useState<DispatchGroup | null>(null);

  const account = accounts?.find((candidate) => candidate.id === mail.accountId) ?? null;
  const groups = buildDispatchGroups({
    version: document.version,
    fromAddress: account?.effectiveFromAddress ?? null,
    recipients: mail.recipients,
    dispatches: dispatches ?? [],
  });
  const active = groups.find((group) => group.active);
  const earlier = groups.filter((group) => !group.active);

  let blockedReason: string | null = null;
  if (!pdfReady) blockedReason = 'Die PDF ist noch nicht bereit.';
  else if (configSaving) blockedReason = 'Einstellungen werden gespeichert …';

  return (
    <Card title="Mailversand">
      <Stack gap={5}>
        <MailConfigFields
          value={mail}
          onChange={onMailChange}
          recipientsHint="Alle Empfänger erhalten eine gemeinsame Mail."
        />
        {isPending ? (
          <LoadingState label="Versandhistorie wird geladen …" />
        ) : (
          <>
            {active ? (
              <DispatchGroupItem
                group={active}
                version={document.version}
                onAction={() => setConfirming(active)}
                blockedReason={blockedReason}
              />
            ) : (
              <Text tone="muted" size="sm">
                Für den Versand ein Mail-Konto und mindestens einen Empfänger angeben.
              </Text>
            )}
            {earlier.length > 0 && (
              <Stack gap={2}>
                <Text size="sm" tone="muted" strong>
                  Frühere Empfängerlisten
                </Text>
                {earlier.map((group) => (
                  <DispatchGroupItem key={group.key} group={group} version={document.version} />
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>

      {mail.accountId && (
        <DispatchConfirmDialog
          group={confirming}
          documentId={document.id}
          version={document.version}
          accountId={mail.accountId}
          recipients={mail.recipients}
          onClose={() => setConfirming(null)}
        />
      )}
    </Card>
  );
}
