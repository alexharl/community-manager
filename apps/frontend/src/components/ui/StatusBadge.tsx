import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';
import styles from './StatusBadge.module.css';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  tone?: StatusTone;
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

export function StatusBadge({ tone = 'neutral', icon, loading, children }: StatusBadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone])}>
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </span>
  );
}
