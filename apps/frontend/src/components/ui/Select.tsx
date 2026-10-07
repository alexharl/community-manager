import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Field } from './Field';
import styles from './Field.module.css';

export interface SelectProps extends ComponentProps<'select'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

/** Natives <select> im App-Look; Optionen als <option>-Kinder. */
export function Select({ label, hint, error, id, className, children, ...rest }: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      {(control) => (
        <div className={styles.selectWrapper}>
          <select {...rest} {...control} className={styles.control}>
            {children}
          </select>
          <ChevronDown className={styles.selectChevron} aria-hidden />
        </div>
      )}
    </Field>
  );
}
