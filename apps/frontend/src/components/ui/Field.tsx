import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Field.module.css';

/** Attribute, die das eigentliche Eingabeelement vom Field erhält. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

/** Beschriftung und Meldungen, die alle Eingabekomponenten gleich anbieten. */
export interface FieldMessageProps {
  label?: ReactNode;
  hint?: ReactNode;
  /** Eingabefehler (rot, markiert das Feld als ungültig). */
  error?: ReactNode;
  /** Hinweis auf einen Zustand, der Aufmerksamkeit braucht, aber kein Eingabefehler ist. */
  warning?: ReactNode;
}

interface FieldProps extends FieldMessageProps {
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Gemeinsamer Rahmen für Eingaben: Label, Meldung (Fehler > Warnung > Hinweis) und ARIA-Verknüpfung. */
export function Field({ id, label, hint, error, warning, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const message = error || warning || hint;
  const messageId = `${controlId}-message`;
  const messageClass = error ? styles.error : warning ? styles.warning : styles.hint;

  return (
    <div className={cx(styles.field, className)}>
      {label && (
        <label htmlFor={controlId} className={styles.label}>
          {label}
        </label>
      )}
      {children({
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={messageClass}>
          {message}
        </p>
      )}
    </div>
  );
}
