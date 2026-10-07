import type { DispatchGroup, DispatchGroupState } from '@cm/shared';
import { useState } from 'react';
import { useSendDispatch } from '../../api/dispatches';
import { ConfirmDialog, TextArea, useToast } from '../../components/ui';
import styles from './DispatchConfirmDialog.module.css';

const TITLES: Record<DispatchGroupState, string> = {
  new: 'Dokument versenden?',
  outdated: 'Erneut versenden?',
  failed: 'Erneut versuchen?',
  current: 'Nochmals senden?',
  pending: 'Dokument versenden?',
};

interface DispatchConfirmDialogProps {
  /** Gruppe, für die versendet wird; `null` = geschlossen. */
  group: DispatchGroup | null;
  documentId: string;
  version: number;
  accountId: string;
  recipients: string[];
  onClose: () => void;
}

/** Bestätigung vor jedem Versand, mit optionalem Begleittext (Kap. 7.4.9). */
export function DispatchConfirmDialog({ group, ...props }: DispatchConfirmDialogProps) {
  if (!group) return null;
  // Eigene Instanz je Öffnen: Begleittext startet leer
  return <DispatchConfirm key={group.key} group={group} {...props} />;
}

function DispatchConfirm({
  group,
  documentId,
  version,
  accountId,
  recipients,
  onClose,
}: DispatchConfirmDialogProps & { group: DispatchGroup }) {
  const send = useSendDispatch(documentId);
  const toast = useToast();
  const [introText, setIntroText] = useState('');

  return (
    <ConfirmDialog
      open
      size="md"
      title={TITLES[group.state]}
      message="Bitte prüfe vor dem Versand, ob das Dokument vollständig und korrekt ist."
      confirmLabel="Jetzt versenden"
      onClose={onClose}
      onConfirm={async () => {
        await send.mutateAsync({ accountId, recipients, introText });
        toast.success('Versand gestartet.');
      }}
    >
      <dl className={styles.details}>
        <dt>Dokument</dt>
        <dd>Version {version} als PDF</dd>
        <dt>Von</dt>
        <dd>{group.from}</dd>
        <dt>An</dt>
        <dd>
          {group.to.join(', ')}
          {group.to.length > 1 && ' (gemeinsame Mail)'}
        </dd>
      </dl>
      <TextArea
        label="Begleittext (optional)"
        hint="Wird der Mail vor dem Protokolltext vorangestellt."
        rows={4}
        maxLength={5000}
        value={introText}
        onChange={(event) => setIntroText(event.target.value)}
      />
    </ConfirmDialog>
  );
}
