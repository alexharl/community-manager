import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../lib/errors';
import styles from './EditableTitle.module.css';
import { useToast } from './toast-context';

interface EditableTitleProps {
  value: string;
  /** Speichert den getrimmten, geänderten Wert; bei Fehler wird zurückgesetzt. */
  onSave: (value: string) => Promise<unknown>;
  maxLength?: number;
  label?: string;
}

/** Titel, der sich per Klick bearbeiten lässt (Enter/Verlassen speichert, Esc bricht ab). */
export function EditableTitle({
  value,
  onSave,
  maxLength = 200,
  label = 'Titel bearbeiten',
}: EditableTitleProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Neuer Wert wird sofort angezeigt, bis die Antwort da ist
  const [pending, setPending] = useState<string | null>(null);

  async function commit() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === value) return;
    setPending(next);
    try {
      await onSave(next);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  if (editing) {
    return (
      <input
        className={styles.input}
        value={draft}
        maxLength={maxLength}
        aria-label={label}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={styles.display}
      title="Zum Bearbeiten klicken"
      aria-label={`${pending ?? value} – ${label}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      <span className={styles.text}>{pending ?? value}</span>
      <Pencil className={styles.icon} aria-hidden />
    </button>
  );
}
