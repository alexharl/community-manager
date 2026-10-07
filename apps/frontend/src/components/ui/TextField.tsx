import type { ComponentProps } from 'react';
import { Field, type FieldMessageProps } from './Field';
import styles from './Field.module.css';

export interface TextFieldProps extends ComponentProps<'input'>, FieldMessageProps {}

export function TextField({ label, hint, error, warning, id, className, ...rest }: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} warning={warning} className={className}>
      {(control) => <input {...rest} {...control} className={styles.control} />}
    </Field>
  );
}
