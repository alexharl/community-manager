import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  /** Aktionen rechts im Kartenkopf, z. B. ein „+“-Button. */
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** `false` für Inhalte, die bis zum Rand reichen (z. B. Listen). */
  padded?: boolean;
  className?: string;
}

export function Card({ title, actions, footer, children, padded = true, className }: CardProps) {
  return (
    <section className={cx(styles.card, className)}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children && <div className={cx(padded && styles.body)}>{children}</div>}
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  );
}
