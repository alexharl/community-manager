import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Field.module.css';

/** Attribute, die das eigentliche Eingabeelement vom Field erhält. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FieldProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Gemeinsamer Rahmen für Eingaben: Label, Hinweis bzw. Fehlermeldung und ARIA-Verknüpfung. */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const message = error || hint;
  const messageId = `${controlId}-message`;

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
        <p id={messageId} className={error ? styles.error : styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
}
