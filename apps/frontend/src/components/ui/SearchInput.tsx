import { Search, X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import styles from './SearchInput.module.css';

interface SearchInputProps
  extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'aria-label'> {
  value: string;
  onChange: (value: string) => void;
  /** Zugänglicher Name des Suchfelds. */
  label: string;
}

/** Suchfeld mit Lupe und Leeren-Button; Entprellen übernimmt der Aufrufer. */
export function SearchInput({ value, onChange, label, className, ...rest }: SearchInputProps) {
  return (
    <div className={cx(styles.search, className)}>
      <Search className={styles.icon} aria-hidden />
      <input
        {...rest}
        type="search"
        aria-label={label}
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Suche leeren"
          title="Suche leeren"
          onClick={() => onChange('')}
        >
          <X aria-hidden />
        </button>
      )}
    </div>
  );
}
