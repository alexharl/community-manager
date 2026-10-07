import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx';
import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  icon: ReactNode;
  /** Pflicht: dient als Tooltip und als zugänglicher Name. */
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger';
  /** Mit `to` wird ein Navigations-Link gerendert. */
  to?: string;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  to,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = cx(styles.iconButton, styles[variant], className);
  if (to) {
    return (
      <Link to={to} className={classes} aria-label={label} title={label}>
        {icon}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      {icon}
    </button>
  );
}
