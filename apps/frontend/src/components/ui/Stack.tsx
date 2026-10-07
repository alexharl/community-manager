import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Stack.module.css';

interface StackProps {
  /** Abstand als Stufe der Spacing-Tokens (--space-1 … --space-6). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6;
  direction?: 'column' | 'row';
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: boolean;
  className?: string;
  children: ReactNode;
}

/** Ein- oder zweidimensionales Flex-Layout mit Token-Abständen. */
export function Stack({
  gap = 4,
  direction = 'column',
  align,
  justify,
  wrap,
  className,
  children,
}: StackProps) {
  return (
    <div
      className={cx(styles.stack, className)}
      style={{
        gap: `var(--space-${gap})`,
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
      }}
    >
      {children}
    </div>
  );
}
