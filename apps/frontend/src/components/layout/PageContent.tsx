import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './PageContent.module.css';

interface PageContentProps {
  /** `full` für Editor-Seiten: volle Breite und Höhe ohne Innenabstand. */
  width?: 'default' | 'full';
  children: ReactNode;
}

export function PageContent({ width = 'default', children }: PageContentProps) {
  return <main className={cx(styles.content, styles[width])}>{children}</main>;
}
