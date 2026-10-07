import { useId, type ReactNode } from 'react';
import styles from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <div className={styles.wrapper}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
      <label htmlFor={switchId} className={styles.label}>
        {label}
      </label>
    </div>
  );
}
