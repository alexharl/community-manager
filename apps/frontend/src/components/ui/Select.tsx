import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Field, type FieldMessageProps } from './Field';
import styles from './Field.module.css';

export interface SelectProps extends ComponentProps<'select'>, FieldMessageProps {}

/** Natives <select> im App-Look; Optionen als <option>-Kinder. */
export function Select({
  label,
  hint,
  error,
  warning,
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} warning={warning} className={className}>
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
