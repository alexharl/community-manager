import { useId, useState, type FormEvent } from 'react';
import { errorMessage } from '../../lib/errors';
import { Button } from './Button';
import { Modal } from './Modal';
import { TextField } from './TextField';

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Erhält den getrimmten Wert. Darf async sein; Fehler werden im Dialog angezeigt. */
  onSubmit: (value: string) => unknown;
}

/** Dialog mit genau einem Pflicht-Textfeld, z. B. „Neue Vorlage“. */
export function PromptDialog({ open, ...props }: PromptDialogProps) {
  if (!open) return null;
  return <PromptDialogContent {...props} />;
}

function PromptDialogContent({
  onClose,
  title,
  label,
  initialValue = '',
  placeholder,
  confirmLabel = 'Speichern',
  onSubmit,
}: Omit<PromptDialogProps, 'open'>) {
  const formId = useId();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = value.trim();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
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
          <Button onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={busy} disabled={!trimmed}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        <TextField
          label={label}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          error={error}
          disabled={busy}
          data-autofocus
        />
      </form>
    </Modal>
  );
}
