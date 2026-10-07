import { useState, type ReactNode } from 'react';
import { errorMessage } from '../../lib/errors';
import { Button } from './Button';
import { Modal } from './Modal';
import { Text } from './Text';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  /** Zusätzliche Inhalte, z. B. ein Begleittext-Feld. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  /** Darf async sein: Der Dialog zeigt so lange einen Ladezustand und schließt erst bei Erfolg. */
  onConfirm: () => unknown;
}

export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  // Eigene Instanz je Öffnen, damit Lade- und Fehlerzustand zurückgesetzt sind
  if (!open) return null;
  return <ConfirmDialogContent {...props} />;
}

function ConfirmDialogContent({
  onClose,
  title,
  message,
  children,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  danger = false,
  confirmDisabled = false,
  onConfirm,
}: Omit<ConfirmDialogProps, 'open'>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy} data-autofocus>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={confirmDisabled}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <Text>{message}</Text>}
      {children}
      {error && (
        <Text tone="danger" size="sm">
          {error}
        </Text>
      )}
    </Modal>
  );
}
