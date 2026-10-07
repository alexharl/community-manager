import type { ComponentProps, ReactNode } from 'react';
import { Field } from './Field';
import styles from './Field.module.css';

export interface TextAreaProps extends ComponentProps<'textarea'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function TextArea({ label, hint, error, id, className, rows = 4, ...rest }: TextAreaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      {(control) => <textarea rows={rows} {...rest} {...control} className={styles.control} />}
    </Field>
  );
}
