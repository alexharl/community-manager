import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface StyleProps {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
}

export interface ButtonProps extends ComponentProps<'button'>, StyleProps {
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps, StyleProps {}

/** Navigations-Link im Button-Look. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cx(styles.button, styles[variant], styles[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
