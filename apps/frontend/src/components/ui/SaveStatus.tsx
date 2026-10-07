import { Check, CircleAlert } from 'lucide-react';
import type { SaveState } from '../../hooks/useAutosave';
import { cx } from '../../lib/cx';
import styles from './SaveStatus.module.css';
import { Spinner } from './Spinner';

interface SaveStatusProps {
  state: SaveState;
  error?: string | null;
}

/** Speicherstatus für Seiten mit Autosave: „Speichert …“ / „Gespeichert“ / Fehler. */
export function SaveStatus({ state, error }: SaveStatusProps) {
  if (state === 'idle') return null;

  return (
    <span
      className={cx(
        styles.status,
        state === 'saved' && styles.saved,
        state === 'error' && styles.error,
      )}
      role="status"
      title={state === 'error' ? (error ?? undefined) : undefined}
    >
      {state === 'saving' && (
        <>
          <Spinner size="sm" />
          Speichert …
        </>
      )}
      {state === 'saved' && (
        <>
          <Check aria-hidden />
          Gespeichert
        </>
      )}
      {state === 'error' && (
        <>
          <CircleAlert aria-hidden />
          Speichern fehlgeschlagen
        </>
      )}
    </span>
  );
}
