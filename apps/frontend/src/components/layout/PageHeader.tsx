import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../ui';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: ReactNode;
  /** Ziel des Zurück-Pfeils links vom Titel. */
  back?: string;
  actions?: ReactNode;
  /** Dezente Statusanzeige vor den Aktionen, z. B. „Gespeichert ✓“. */
  status?: ReactNode;
}

export function PageHeader({ title, back, actions, status }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {back && <IconButton to={back} icon={<ArrowLeft />} label="Zurück" />}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {(status || actions) && (
        <div className={styles.right}>
          {status && <span className={styles.status}>{status}</span>}
          {actions}
        </div>
      )}
    </header>
  );
}
