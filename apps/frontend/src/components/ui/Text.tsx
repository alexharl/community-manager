import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Text.module.css';

interface TextProps {
  as?: 'p' | 'span' | 'div';
  tone?: 'default' | 'muted' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  /** Halbfett, z. B. als Beschriftung ohne Eingabefeld. */
  strong?: boolean;
  className?: string;
  children: ReactNode;
}

export function Text({
  as: Element = 'p',
  tone = 'default',
  size = 'md',
  strong = false,
  className,
  children,
}: TextProps) {
  return (
    <Element className={cx(styles[tone], styles[size], strong && styles.strong, className)}>
      {children}
    </Element>
  );
}
