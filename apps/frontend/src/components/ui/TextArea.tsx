import type { ComponentProps } from 'react';
import { Field, type FieldMessageProps } from './Field';
import styles from './Field.module.css';

export interface TextAreaProps extends ComponentProps<'textarea'>, FieldMessageProps {}

export function TextArea({
  label,
  hint,
  error,
  warning,
  id,
  className,
  rows = 4,
  ...rest
}: TextAreaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} warning={warning} className={className}>
      {(control) => <textarea rows={rows} {...rest} {...control} className={styles.control} />}
    </Field>
  );
}
