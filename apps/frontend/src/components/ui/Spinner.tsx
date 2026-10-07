import { cx } from '../../lib/cx';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Mit Label wird der Spinner für Screenreader angesagt, sonst ist er rein dekorativ. */
  label?: string;
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <span
      className={cx(styles.spinner, styles[size])}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
