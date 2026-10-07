import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx';
import styles from './ListItem.module.css';

interface ListItemProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Weitere Zeile unter dem Untertitel, z. B. ein Suchausschnitt (gekürzt auf 2–3 Zeilen). */
  detail?: ReactNode;
  /** Rechtsbündige Zusatzinfo, z. B. ein Datum oder Status. */
  meta?: ReactNode;
  /** Eigene Aktionen (Buttons) – liegen außerhalb der klickbaren Fläche. */
  trailing?: ReactNode;
  /** Interner Link (React Router). */
  to?: string;
  /** Externer Link, z. B. PDF im neuen Tab. */
  href?: string;
  target?: string;
  onClick?: () => void;
  tone?: 'default' | 'warning' | 'danger';
  disabled?: boolean;
}

/** Einheitliche Listenzeile; Inhalte nur aus Inline-Elementen, da sie in <a>/<button> liegen. */
export function ListItem({
  icon,
  title,
  subtitle,
  detail,
  meta,
  trailing,
  to,
  href,
  target,
  onClick,
  tone = 'default',
  disabled = false,
}: ListItemProps) {
  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </>
  );

  const interactive = !disabled && Boolean(to || href || onClick);
  const mainClass = cx(styles.main, interactive && styles.interactive);

  let main: ReactNode;
  if (to && !disabled) {
    main = (
      <Link to={to} className={mainClass}>
        {content}
      </Link>
    );
  } else if (href && !disabled) {
    main = (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={mainClass}
      >
        {content}
      </a>
    );
  } else if (onClick) {
    main = (
      <button type="button" className={mainClass} onClick={onClick} disabled={disabled}>
        {content}
      </button>
    );
  } else {
    main = <div className={mainClass}>{content}</div>;
  }

  return (
    <div className={cx(styles.item, tone !== 'default' && styles[tone])}>
      {main}
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  );
}

/** Container für ListItems mit Trennlinien. */
export function List({ children }: { children: ReactNode }) {
  return <div className={styles.list}>{children}</div>;
}
