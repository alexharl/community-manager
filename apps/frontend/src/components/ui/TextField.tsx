import type { ComponentProps, ReactNode } from 'react';
import { Field } from './Field';
import styles from './Field.module.css';

export interface TextFieldProps extends ComponentProps<'input'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      {(control) => <input {...rest} {...control} className={styles.control} />}
    </Field>
  );
}
