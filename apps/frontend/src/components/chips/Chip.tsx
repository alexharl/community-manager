import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Chip.module.css';

interface ChipProps {
  children: ReactNode;
  /** Zeigt ein × zum Entfernen. */
  onRemove?: () => void;
  removeLabel?: string;
  /** Umschaltbarer Chip, z. B. in der Tag-Filterleiste. */
  onToggle?: () => void;
  pressed?: boolean;
}

/** Ein Wert als Chip: statisch, entfernbar oder umschaltbar. */
export function Chip({
  children,
  onRemove,
  removeLabel = 'Entfernen',
  onToggle,
  pressed,
}: ChipProps) {
  if (onToggle) {
    return (
      <button
        type="button"
        className={cx(styles.chip, styles.toggle, pressed && styles.pressed)}
        aria-pressed={pressed}
        onClick={onToggle}
      >
        <span className={styles.label}>{children}</span>
      </button>
    );
  }

  return (
    <span className={cx(styles.chip, onRemove && styles.removable)}>
      <span className={styles.label}>{children}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
        >
          <X aria-hidden />
        </button>
      )}
    </span>
  );
}
