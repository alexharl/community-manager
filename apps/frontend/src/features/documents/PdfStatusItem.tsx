import type { PdfInfo } from '@cm/shared';
import { Check, FileText, RotateCw, TriangleAlert } from 'lucide-react';
import { Button, ListItem, StatusBadge } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import styles from './PdfStatusItem.module.css';

export type PdfState = 'missing' | 'generating' | 'ready' | 'error';

interface PdfStatusItemProps {
  state: PdfState;
  pdf: PdfInfo | null;
  /** Dokumenttitel; angezeigt als „<Titel>.pdf“. */
  title: string;
  href: string;
  error?: string | null;
  onRetry: () => void;
}

/** PDF-Eintrag der Abschlussseite: noch nicht erstellt → wird erstellt → erstellt ✓ (Kap. 7.4.8). */
export function PdfStatusItem({ state, pdf, title, href, error, onRetry }: PdfStatusItemProps) {
  const name = `${title}.pdf`;

  let item;
  if (state === 'ready' && pdf) {
    item = (
      <ListItem
        icon={<FileText />}
        title={name}
        subtitle={`Erstellt am ${formatDateTime(pdf.createdAt)} · Version ${pdf.version}`}
        meta={
          <StatusBadge tone="success" icon={<Check />}>
            Aktuell
          </StatusBadge>
        }
        href={href}
        target="_blank"
      />
    );
  } else if (state === 'generating') {
    item = (
      <ListItem
        icon={<FileText />}
        title={name}
        subtitle="Die PDF wird aus dem aktuellen Stand erzeugt."
        meta={
          <StatusBadge tone="info" loading>
            Wird erstellt …
          </StatusBadge>
        }
      />
    );
  } else if (state === 'error') {
    item = (
      <ListItem
        icon={<TriangleAlert />}
        tone="danger"
        title={name}
        subtitle={error ?? 'Fehler bei der Erstellung.'}
        trailing={
          <Button size="sm" icon={<RotateCw />} onClick={onRetry}>
            Erneut versuchen
          </Button>
        }
      />
    );
  } else {
    item = (
      <ListItem
        icon={<FileText />}
        title={name}
        meta={<StatusBadge>Noch nicht erstellt</StatusBadge>}
      />
    );
  }

  return <div className={styles.box}>{item}</div>;
}
